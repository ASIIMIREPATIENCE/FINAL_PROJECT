// View transaction details
    function viewTransactionDetails(transactionId) {
      // You can implement a modal or redirect to a details page
      window.location.href = `/transaction/${transactionId}`;
    }
    
    // Edit transaction (create a reversal and new transaction)
    function editTransaction(transactionId) {
      if (confirm('This will allow you to modify this transaction. Do you want to proceed?')) {
        window.location.href = `/editTransaction/${transactionId}`;
      }
    }
    
    // Revert/undo a transaction
    function revertTransaction(transactionId) {
      if (confirm('Are you sure you want to revert this transaction? This will reverse the stock changes.')) {
        fetch(`/revertTransaction/${transactionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            alert('Transaction reverted successfully!');
            location.reload();
          } else {
            alert('Error reverting transaction: ' + data.message);
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('Error reverting transaction');
        });
      }
    }