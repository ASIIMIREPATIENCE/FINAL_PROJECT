

function initPaymentChart(salesSummary) {
  const canvas = document.getElementById('paymentChart');
  
  if (!canvas) {
    console.log('Payment chart canvas not found');
    return;
  }
  
  // Check if Chartis loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded!');
    return;
  }
  
  const chartLabels = [];
  const chartData = [];
  const chartColors = [];
  
  if (salesSummary.cashSales > 0) {
    chartLabels.push('Cash');
    chartData.push(salesSummary.cashSales);
    chartColors.push('#0D3B2E');
  }
  if (salesSummary.mobileSales > 0) {
    chartLabels.push('Mobile Money');
    chartData.push(salesSummary.mobileSales);
    chartColors.push('#C6A43F');
  }
  if (salesSummary.bankSales > 0) {
    chartLabels.push('Bank Transfer');
    chartData.push(salesSummary.bankSales);
    chartColors.push('#2E7D64');
  }
  if (salesSummary.depositSchemeSales > 0) {
    chartLabels.push('Deposit Scheme');
    chartData.push(salesSummary.depositSchemeSales);
    chartColors.push('#17a2b8');
  }
  
  // Destroy existing chart if it exists
  if (window.paymentChartInstance) {
    window.paymentChartInstance.destroy();
  }
  
  // Create new chart
  if (chartData.length > 0) {
    window.paymentChartInstance = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [{
          data: chartData,
          backgroundColor: chartColors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { 
            position: 'bottom',
            labels: { 
              font: { size: 11 },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: UGX ${value.toLocaleString()} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  } else {
    // Show message if no data
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.fillText('No payment data available', canvas.width / 2, canvas.height / 2);
  }
}

// Initialize chart when DOM is ready and data is available
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, checking for chart data...');
  
  if (window.salesChartData) {
    console.log('Chart data found:', window.salesChartData);
    initPaymentChart(window.salesChartData);
  } else {
    console.log('No chart data found. Make sure you are on the sales report.');
  }
});