// Import the Express framework to create routing functionality
const express = require('express');
// Create a new router instance to handle route definitions
const router = express.Router();
// Import the Depositor model for database operations on depositors collection
const Depositor = require('../models/Depositor');
// Import the Stock model for database operations on stock/inventory collection
const Stock = require('../models/Stock');
// Import the Registration model for user account management (referenced but not directly used here)
const Registration = require('../models/Registration');
// Import the Sale model for creating sale records when goods are picked up
const Sale = require('../models/Sales');

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================
// Middleware function to check if user is authenticated before allowing access to protected routes
function isAuthenticated(req, res, next) {
    // Check if Passport.js has authenticated the user (session contains user info)
    if (req.isAuthenticated()) {
        // User is logged in, proceed to the next middleware or route handler
        return next();
    }
    // User is not logged in, redirect them to the home/login page
    res.redirect('/');
}

// ============================================================
// GET /scheme - DISPLAY DEPOSIT SCHEME PAGE
// ============================================================
// Route handler for GET requests to '/scheme' - displays the main deposit scheme dashboard
router.get('/scheme', isAuthenticated, async (req, res) => {
    try {
        // Get the currently logged-in user from the request object
        const user = req.user;
        // Fetch all depositors from database, sorted by join date descending (newest first)
        const depositors = await Depositor.find().sort({ joinDate: -1 });
        // Fetch all stock items that have quantity greater than zero (in stock)
        const stockItems = await Stock.find({ quantity: { $gt: 0 } });
        
        // Initialize variable to accumulate total savings target (sum of all amounts owed)
        let totalSavingsTarget = 0;
        // Initialize variable to accumulate total amount paid by all depositors
        let totalAmountPaid = 0;
        
        // Loop through each depositor to calculate running totals
        depositors.forEach(depositor => {
            // Add this depositor's total owed to the overall total (default to 0 if undefined)
            totalSavingsTarget += depositor.totalAmountOwed || 0;
            // Add this depositor's total paid to the overall total (default to 0 if undefined)
            totalAmountPaid += depositor.totalPaid || 0;
        });
        
        // Array to hold all transaction records from all depositors
        let allTransactions = [];
        // Loop through each depositor to extract their deposit history
        depositors.forEach(depositor => {
            // Check if depositor has any deposit history entries
            if (depositor.depositHistory && depositor.depositHistory.length) {
                // Transform each transaction into a display-friendly format with depositor info
                const transactionsWithInfo = depositor.depositHistory.map(transaction => ({
                    date: transaction.date,                      // Date of the transaction
                    depositorName: depositor.fullName,          // Name of the depositor
                    totalOwed: transaction.totalOwedAtTime,     // Total owed at time of transaction
                    amountPaid: transaction.amountPaid,         // Amount paid in this transaction
                    balanceAfter: transaction.balanceAfter,     // Remaining balance after payment
                    paymentMethod: transaction.paymentMethod,   // Method of payment (Cash, Mobile Money, etc.)
                    attendantName: transaction.attendantName    // Name of staff who recorded transaction
                }));
                // Add all transformed transactions to the main array using spread operator
                allTransactions.push(...transactionsWithInfo);
            }
        });
        
        // Sort all transactions by date in descending order (newest first)
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        // Get only the 50 most recent transactions to display on the dashboard
        const recentTransactions = allTransactions.slice(0, 50);
        
        // Pickup statistics - various counts for dashboard widgets
        
        // Count depositors who have fully paid (remaining balance = 0) and are marked ready for pickup
        const readyForPickup = await Depositor.countDocuments({
            remainingBalance: 0,
            pickupStatus: 'ready'
        });
        
        // Get today's date at midnight (00:00:00) for accurate date comparisons
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Calculate tomorrow's date (add 1 day to today) for date range queries
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Count depositors who were picked up today (pickup date between today and tomorrow)
        const pickedUpToday = await Depositor.countDocuments({
            pickupStatus: 'picked_up',
            pickupDate: { $gte: today, $lt: tomorrow }
        });
        
        // Count depositors who have fully paid but are still pending (not marked ready or picked up)
        const pendingPickups = await Depositor.countDocuments({
            remainingBalance: 0,
            pickupStatus: 'pending'
        });
        
        // Get the 5 most recent pickup records to display in the recent activity section
        const recentPickups = await Depositor.find({
            pickupStatus: 'picked_up'
        })
        .sort({ pickupDate: -1 })      // Sort by pickup date, newest first
        .limit(5)                       // Limit to only 5 records
        .select('fullName pickupDate pickedUpBy items');  // Select only specific fields for efficiency
        
        // Render the scheme dashboard view (EJS template) with all the collected data
        res.render('scheme', {
            depositors: depositors,                           // All depositors for the list view
            stockItems: stockItems,                           // Available stock items
            recentTransactions: recentTransactions,           // 50 most recent deposit transactions
            totalSavingsTarget: totalSavingsTarget,           // Sum of all amounts owed
            totalAmountPaid: totalAmountPaid,                 // Sum of all payments made
            totalRemaining: totalSavingsTarget - totalAmountPaid, // Total remaining balance overall
            depositorsCount: depositors.length,               // Total number of depositors registered
            currentUser: user,                                // Currently logged in user info
            readyForPickup: readyForPickup,                   // Count of ready-for-pickup orders
            pickedUpToday: pickedUpToday,                     // Count of pickups done today
            pendingPickups: pendingPickups,                   // Count of pending pickups
            recentPickups: recentPickups,                     // Last 5 pickup records
            messages: {                                        // Flash messages for user feedback
                success: req.flash ? req.flash('success')[0] : null,  // Success message if exists
                error: req.flash ? req.flash('error')[0] : null       // Error message if exists
            }
        });
        
    } catch (error) {
        // Log any errors that occur during page loading to server console
        console.error('Error loading scheme page:', error);
        // Send a 500 Internal Server Error response to the client
        res.status(500).send('Server error');
    }
});

// ============================================================
// POST /registerDepositor - REGISTER NEW DEPOSITOR
// ============================================================
// Route handler for POST requests to '/registerDepositor' - creates a new depositor in the savings scheme
router.post('/registerDepositor', isAuthenticated, async (req, res) => {
    try {
        // Extract all form fields from the request body using destructuring
        const { fullName, phoneNumber, nin, employer, cartItems, needTransport, distance } = req.body;
        // Get the currently logged-in user who is performing the registration
        const user = req.user;
        // Determine the attendant name (use logged-in user's name or fallback to 'System Admin')
        const attendantName = user ? user.fullname : 'Admin';
        
        // Check if a depositor with this National ID Number (NIN) already exists in the database
        const existingDepositor = await Depositor.findOne({ nin: nin });
        if (existingDepositor) {
            // Set an error flash message to inform the user about duplicate NIN
            if (req.flash) req.flash('error', 'Depositor with this NIN already exists');
            // Redirect back to the scheme page
            return res.redirect('/scheme');
        }
        
        // Initialize array for processed items and variable for subtotal calculation
        let items = [];
        let itemsSubtotal = 0;
        
        // Check if cartItems exists and is not an empty JSON array string
        if (cartItems && cartItems !== '[]') {
            // Parse the JSON string from the form data into a JavaScript array
            items = JSON.parse(cartItems);
            // Transform each cart item into the format expected by the Depositor model
            items = items.map(item => ({
                productname: item.productName,      // Name of the product
                quantity: item.quantity,            // Quantity purchased
                unitprice: item.unitPrice,          // Price per unit
                subtotal: item.quantity * item.unitPrice  // Calculate total for this item
            }));
            // Calculate the total subtotal by summing all items' subtotals
            itemsSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        }
        
        // Parse transport-related fields from string to appropriate types
        const needTrans = needTransport === 'true';  // Convert string 'true'/'false' to boolean
        const distanceKm = parseInt(distance) || 0;   // Convert distance to integer, default to 0 if invalid
        let transportFee = 0;                         // Initialize transport fee to 0
        
        // Calculate transport fee only if transport is needed AND distance is greater than 0
        if (needTrans && distanceKm > 0) {
            // Check if customer qualifies for free transport (subtotal >= 500,000 AND distance <= 10 km)
            const isFree = (itemsSubtotal >= 500000 && distanceKm <= 10);
            // If not eligible for free transport, charge the standard fee of 30,000 UGX
            if (!isFree) {
                transportFee = 30000;
            }
        }
        
        // Calculate total amount owed = cost of items + transport fee (if any)
        const totalAmountOwed = itemsSubtotal + transportFee;
        
        // Create a new Depositor document instance with all the collected data
        const newDepositor = new Depositor({
            fullName: fullName,                       // Depositor's full name
            phoneNumber: phoneNumber,                 // Contact phone number
            nin: nin,                                 // National ID Number (unique identifier)
            employer: employer || '',                 // Employer name (empty string if not provided)
            joinDate: new Date(),                     // Current date/time as join date
            items: items,                             // Array of items purchased
            itemsSubtotal: itemsSubtotal,             // Total cost of all items
            needTransport: needTrans,                 // Whether transport is needed (boolean)
            distance: distanceKm,                     // Distance in kilometers
            transportFee: transportFee,               // Calculated transport fee
            totalAmountOwed: totalAmountOwed,         // Total amount the depositor owes
            totalPaid: 0,                             // No payments made yet (initial value)
            remainingBalance: totalAmountOwed,        // Full amount remains to be paid
            depositHistory: [],                       // Empty deposit history array initially
            pickupStatus: 'pending',                  // Initial status - not ready for pickup
            pickupHistory: []                         // Empty pickup history array initially
        });
        
        // Save the new depositor to the database (asynchronous operation)
        await newDepositor.save();
        
        // Log the successful registration to server console for audit trail
        console.log(`[${new Date().toLocaleString()}] New depositor registered: ${fullName}`);
        console.log(`   Items Subtotal: UGX ${itemsSubtotal.toLocaleString()}`);
        console.log(`   Transport Fee: UGX ${transportFee.toLocaleString()}`);
        console.log(`   TOTAL OWED: UGX ${totalAmountOwed.toLocaleString()}`);
        
        // Set a success flash message to confirm registration to the user
        if (req.flash) req.flash('success', `Depositor ${fullName} registered successfully. Total: UGX ${totalAmountOwed.toLocaleString()}`);
        // Redirect back to the scheme page to see the updated depositor list
        res.redirect('/scheme');
        
    } catch (error) {
        // Log any errors that occur during registration process
        console.error('Error registering depositor:', error);
        // Set an error flash message with the specific error details
        if (req.flash) req.flash('error', 'Error registering depositor: ' + error.message);
        // Redirect back to scheme page
        res.redirect('/scheme');
    }
});

// ============================================================
// POST /recordDeposit - RECORD DEPOSIT PAYMENT
// ============================================================
// Route handler for POST requests to '/recordDeposit' - records a payment from an existing depositor
router.post('/recordDeposit', isAuthenticated, async (req, res) => {
    try {
        // Extract payment information from the request body
        const { depositorId, amountPaid, paymentMethod, notes } = req.body;
        // Get the currently logged-in user
        const user = req.user;
        // Get attendant name and ID for the transaction record
        const attendantName = user ? user.fullname : 'Admin';
        const attendantId = user ? user._id : null;
        
        // Find the depositor in the database by their unique MongoDB ID
        const depositor = await Depositor.findById(depositorId);
        // If depositor doesn't exist, show error message and redirect
        if (!depositor) {
            if (req.flash) req.flash('error', 'Depositor not found');
            return res.redirect('/scheme');
        }
        
        // Convert the amount paid from string to number for mathematical calculations
        const amount = Number(amountPaid);
        
        // Validate that the payment amount is greater than zero
        if (amount <= 0) {
            if (req.flash) req.flash('error', 'Amount must be greater than 0');
            return res.redirect('/scheme');
        }
        
        // Ensure the payment amount does not exceed the remaining balance
        if (amount > depositor.remainingBalance) {
            if (req.flash) req.flash('error', `Amount cannot exceed remaining balance of UGX ${depositor.remainingBalance.toLocaleString()}`);
            return res.redirect('/scheme');
        }
        
        // Calculate new balances after this payment
        const newRemaining = depositor.remainingBalance - amount;  // Subtract payment from remaining balance
        const newTotalPaid = depositor.totalPaid + amount;          // Add payment to total paid amount
        
        // Create a detailed record of this deposit transaction for history
        const depositRecord = {
            date: new Date(),                                      // Timestamp of the payment
            amountPaid: amount,                                    // Amount paid in this transaction
            totalOwedAtTime: depositor.totalAmountOwed,           // Snapshot of total owed at this time
            balanceAfter: newRemaining,                           // Remaining balance after this payment
            paymentMethod: paymentMethod || 'Cash',               // Payment method (default to 'Cash')
            attendant: attendantId,                               // ID of staff who recorded payment
            attendantName: attendantName,                         // Name of staff who recorded payment
            notes: notes || '',                                   // Any additional notes about the payment
            transportFee: depositor.transportFee                  // Copy of transport fee for reference
        };
        
        // Add the deposit record to the depositor's history array
        depositor.depositHistory.push(depositRecord);
        // Update the depositor's total paid amount
        depositor.totalPaid = newTotalPaid;
        // Update the depositor's remaining balance
        depositor.remainingBalance = newRemaining;
        
        // If the depositor has now fully paid (remaining balance is 0 or less)
        if (newRemaining <= 0) {
            // Update status to 'completed' (fully paid)
            depositor.status = 'completed';
        }
        
        // Save all changes to the database
        await depositor.save();
        
        // Get the most recently added deposit record (the one we just created)
        const savedDeposit = depositor.depositHistory[depositor.depositHistory.length - 1];
        
        // Log the deposit transaction to server console for audit trail
        console.log(`[${new Date().toLocaleString()}] Deposit recorded for ${depositor.fullName}`);
        console.log(`   Amount: UGX ${amount.toLocaleString()}`);
        console.log(`   Remaining: UGX ${newRemaining.toLocaleString()}`);
        
        // Render a receipt page instead of redirecting (shows printable receipt)
        res.render('deposit_receipt', {
            deposit: savedDeposit,      // The deposit transaction details
            depositor: depositor,        // The depositor's information
            currentUser: req.user,       // Currently logged in user
            success: true                // Flag indicating successful transaction
        });
        
    } catch (error) {
        // Log any errors that occur during payment recording
        console.error('Error recording deposit:', error);
        // Set error flash message with error details
        if (req.flash) req.flash('error', 'Error recording deposit: ' + error.message);
        // Redirect back to scheme page
        res.redirect('/scheme');
    }
});

// ============================================================
// POST /mark-ready/:id - MARK GOODS READY FOR PICKUP
// ============================================================
// Route handler for POST requests to '/mark-ready/:id' - marks a depositor's goods as ready for pickup
router.post('/mark-ready/:id', isAuthenticated, async (req, res) => {
    try {
        // Extract the depositor ID from the URL parameter
        const { id } = req.params;
        // Extract any notes from the request body
        const { notes } = req.body;
        // Get the currently logged-in user
        const user = req.user;
        // Get attendant information for audit trail
        const attendantName = user ? user.fullname : 'Admin';
        const attendantId = user ? user._id : null;
        
        // Find the depositor by their ID in the database
        const depositor = await Depositor.findById(id);
        // If depositor doesn't exist, show error and redirect
        if (!depositor) {
            if (req.flash) req.flash('error', 'Depositor not found');
            return res.redirect('/scheme');
        }
        
        // Check if the depositor has fully paid (remaining balance must be 0)
        if (depositor.remainingBalance > 0) {
            // Set error message showing how much is still owed
            if (req.flash) req.flash('error', `Cannot mark ready. Payment not complete. Remaining: UGX ${depositor.remainingBalance.toLocaleString()}`);
            return res.redirect('/scheme');
        }
        
        // Update pickup status to 'ready' (goods are prepared and waiting for customer)
        depositor.pickupStatus = 'ready';
        // Store any notes about the ready status
        depositor.pickupNotes = notes || '';
        
        // Record this action in the pickup history for audit purposes
        depositor.pickupHistory.push({
            action: 'marked_ready',                    // Type of action performed
            date: new Date(),                          // When it happened
            attendant: attendantId,                    // Who performed the action
            attendantName: attendantName,              // Name of the person
            notes: notes || 'Goods marked ready for pickup'  // Description of action
        });
        
        // Set overall status to 'completed' (all financial obligations fulfilled)
        depositor.status = 'completed';
        
        // Save all changes to the database
        await depositor.save();
        
        // Log the action to server console for audit trail
        console.log(`[${new Date().toLocaleString()}] Goods marked ready for ${depositor.fullName} by ${attendantName}`);
        
        // Set success flash message to inform user
        if (req.flash) req.flash('success', `Goods for ${depositor.fullName} marked READY for pickup.`);
        // Redirect back to scheme dashboard
        res.redirect('/scheme');
        
    } catch (error) {
        // Log any errors that occur
        console.error('Error marking ready:', error);
        // Set error flash message
        if (req.flash) req.flash('error', 'Error marking goods ready');
        // Redirect back to scheme page
        res.redirect('/scheme');
    }
});

// ============================================================
// POST /record-pickup/:id - RECORD PICKUP AND CREATE SALE
// ============================================================
// Route handler for POST requests to '/record-pickup/:id' - records actual pickup, deducts stock, creates sale
router.post('/record-pickup/:id', isAuthenticated, async (req, res) => {
    try {
        // Extract depositor ID from URL parameter
        const { id } = req.params;
        // Extract pickup information from request body
        const { pickedUpBy, notes } = req.body;
        // Get currently logged-in user
        const user = req.user;
        // Get attendant information for records
        const attendantName = user ? user.fullname : 'Admin';
        const attendantId = user ? user._id : null;
        
        // Find the depositor in the database
        const depositor = await Depositor.findById(id);
        // Check if depositor exists
        if (!depositor) {
            if (req.flash) req.flash('error', 'Depositor not found');
            return res.redirect('/scheme');
        }
        
        // Verify that goods have been marked ready for pickup before allowing pickup
        if (depositor.pickupStatus !== 'ready') {
            if (req.flash) req.flash('error', 'Goods are not marked ready for pickup.');
            return res.redirect('/scheme');
        }
        
        // ========== DEDUCT ITEMS FROM STOCK ==========
        // This section updates inventory levels by removing the items being picked up
        
        // Array to record successful stock deductions (for receipt display)
        const stockUpdates = [];
        // Array to collect any stock-related errors
        let stockErrors = [];
        
        // Loop through each item in the depositor's order
        for (const item of depositor.items) {
            // Find the matching stock item (must match both product name AND selling price)
            const stockItem = await Stock.findOne({ 
                productname: item.productname,
                sellingprice: item.unitprice
            });
            
            // If product not found in stock, add to errors list
            if (!stockItem) {
                stockErrors.push(`Product "${item.productname}" not found`);
                continue;  // Skip to next item
            }
            
            // Check if there's enough quantity in stock to fulfill the order
            if (stockItem.quantity < item.quantity) {
                stockErrors.push(`Insufficient stock for "${item.productname}". Available: ${stockItem.quantity}, Need: ${item.quantity}`);
                continue;  // Skip to next item
            }
            
            // Store the original quantity before deduction (for receipt display)
            const oldQuantity = stockItem.quantity;
            // Deduct the ordered quantity from stock
            stockItem.quantity -= item.quantity;
            // Save the updated stock item to database
            await stockItem.save();
            
            // Record the stock update for display on the receipt
            stockUpdates.push({
                productname: item.productname,
                oldQuantity: oldQuantity,
                deducted: item.quantity,
                newQuantity: stockItem.quantity
            });
        }
        
        // If any stock errors occurred, abort the entire pickup process
        if (stockErrors.length > 0) {
            if (req.flash) req.flash('error', 'Stock errors: ' + stockErrors.join(', '));
            return res.redirect('/scheme');
        }
        
        // ========== CREATE SALE RECORD ==========
        // Transform depositor's items into sale items format
        const saleItems = depositor.items.map(item => ({
            productname: item.productname,
            quantity: item.quantity,
            unitprice: item.unitprice,
            subtotal: item.subtotal
        }));
        
        // Create sale data object matching the Sale model schema
        const saleData = {
            customername: depositor.fullName,                        // Customer's full name
            phonenumber: depositor.phoneNumber,                      // Contact phone number
            nin: depositor.nin || 'N/A',                             // National ID (or 'N/A' if missing)
            paymentmethod: 'Deposit Scheme',                         // Special payment method type for scheme
            items: saleItems,                                        // Items purchased
            cartSubtotal: depositor.itemsSubtotal,                   // Subtotal before transport
            distance: depositor.distance || 0,                       // Transport distance in kilometers
            transportFee: depositor.transportFee || 0,               // Transport fee charged
            grandTotal: depositor.totalAmountOwed,                   // Total amount paid through scheme
            freeTransportApplied: depositor.transportFee === 0 && depositor.needTransport, // Was transport free?
            needTransport: depositor.needTransport || false,         // Whether transport was needed
            attendantName: attendantName,                            // Staff who processed pickup
            attendant: attendantId,                                  // Staff ID
            Date: new Date(),                                        // Pickup date/time
            depositSchemeId: depositor._id,                          // Link back to deposit record
            pickupRecordedBy: pickedUpBy || depositor.fullName,      // Who picked up the goods
            pickupNotes: notes || ''                                 // Any additional notes
        };
        
        // Create a new Sale document instance and save to database
        const newSale = new Sale(saleData);
        await newSale.save();
        
        // ========== UPDATE PICKUP STATUS ==========
        // Update depositor record with pickup information
        depositor.pickupStatus = 'picked_up';                        // Status changed to picked up
        depositor.pickupDate = new Date();                           // Timestamp of pickup
        depositor.pickedUpBy = pickedUpBy || depositor.fullName;     // Who took the goods
        depositor.pickupNotes = notes || '';                         // Any pickup notes
        depositor.saleRecordId = newSale._id;                        // Link to the sale record
        
        // Record this pickup action in history for audit trail
        depositor.pickupHistory.push({
            action: 'picked_up',                                     // Type of action
            date: new Date(),                                        // When it happened
            attendant: attendantId,                                  // Who recorded it
            attendantName: attendantName,                            // Name of staff
            notes: notes || `Goods picked up by ${pickedUpBy || depositor.fullName}. Sale: #SALE-${newSale._id.toString().slice(-8)}`  // Description
        });
        
        // Update overall status to 'picked_up' (complete workflow)
        depositor.status = 'picked_up';
        
        // Save all changes to the depositor record
        await depositor.save();
        
        // Log the successful pickup to server console for audit trail
        console.log(`[${new Date().toLocaleString()}] Pickup recorded for ${depositor.fullName} by ${attendantName}`);
        console.log(`   Sale: #SALE-${newSale._id.toString().slice(-8)}`);
        console.log(`   Total: UGX ${depositor.totalAmountOwed.toLocaleString()}`);
        
        // Render a pickup receipt showing all transaction details
        res.render('pickup_receipt', {
            depositor: depositor,          // Depositor information
            sale: newSale,                 // Sale record
            stockUpdates: stockUpdates,    // Stock deduction details
            pickupDate: new Date(),        // When pickup occurred
            pickedUpBy: pickedUpBy || depositor.fullName,  // Who picked up
            attendantName: attendantName,  // Staff name
            currentUser: req.user,         // Current logged-in user
            success: true                  // Success flag
        });
        
    } catch (error) {
        // Log any errors that occur during pickup processing
        console.error('Error recording pickup:', error);
        // Set error flash message with error details
        if (req.flash) req.flash('error', 'Error recording pickup: ' + error.message);
        // Redirect back to scheme page
        res.redirect('/scheme');
    }
});

// ============================================================
// POST /cancel-pickup/:id - CANCEL READY STATUS
// ============================================================
// Route handler for POST requests to '/cancel-pickup/:id' - cancels the "ready for pickup" status
router.post('/cancel-pickup/:id', isAuthenticated, async (req, res) => {
    try {
        // Extract depositor ID from URL parameter
        const { id } = req.params;
        // Extract cancellation notes from request body
        const { notes } = req.body;
        // Get currently logged-in user
        const user = req.user;
        // Get attendant information for audit trail
        const attendantName = user ? user.fullname : 'Admin';
        const attendantId = user ? user._id : null;
        
        // Find the depositor in the database
        const depositor = await Depositor.findById(id);
        // Check if depositor exists
        if (!depositor) {
            if (req.flash) req.flash('error', 'Depositor not found');
            return res.redirect('/scheme');
        }
        
        // Revert pickup status back to 'pending' (not ready for pickup)
        depositor.pickupStatus = 'pending';
        
        // Record the cancellation action in pickup history for audit purposes
        depositor.pickupHistory.push({
            action: 'cancelled',                         // Type of action
            date: new Date(),                            // When cancellation occurred
            attendant: attendantId,                      // Who cancelled it
            attendantName: attendantName,                // Name of staff
            notes: notes || 'Pickup ready status cancelled'  // Reason for cancellation
        });
        
        // Save the updated depositor record to database
        await depositor.save();
        
        // Log cancellation to server console for audit trail
        console.log(`[${new Date().toLocaleString()}] Pickup status cancelled for ${depositor.fullName} by ${attendantName}`);
        
        // Set success flash message to inform user
        if (req.flash) req.flash('success', `Pickup ready status cancelled for ${depositor.fullName}.`);
        // Redirect back to scheme dashboard
        res.redirect('/scheme');
        
    } catch (error) {
        // Log any errors that occur during cancellation
        console.error('Error cancelling pickup:', error);
        // Set error flash message
        if (req.flash) req.flash('error', 'Error cancelling pickup status');
        // Redirect back to scheme page
        res.redirect('/scheme');
    }
});

// Export the router so it can be used in the main application file
module.exports = router;