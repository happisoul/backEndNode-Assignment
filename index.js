const express = require('express');
const app = express();
const PORT = 3000;
const path = require('path');
const fs = require('fs');

const fetch = require('node-fetch').default;// Add this line to import the fetch module

const htmlFilePath = path.join(__dirname, 'index.html');
const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');

app.use(express.json());

// Function to fetch all data from the third-party API
async function fetchAllTransactionData() {
  try {
    const response = await fetch('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    return response.json();
  } catch (error) {
    console.error('Error fetching data:', error.message);
    return null;
  }
}

// Function to fetch data from the third-party API based on the month
async function fetchTransactionData(month) {
  const allData = await fetchAllTransactionData();
  if (!allData) {
    return null;
  }
  return allData.filter((item) => new Date(item.dateOfSale).getMonth() === month);
}

function isValidMonth(month) {
  return !isNaN(month) && month >= 0 && month <= 11;
}

app.get('/', async (req, res) => {
  res.send(htmlContent);
});

// New API endpoint for fetching all transactions based on the month
app.get('/api/transactions/:month', async (req, res) => {
  const month = parseInt(req.params.month) - 1;

  if (!isValidMonth(month)) {
    res.status(400).json({ error: 'Invalid month parameter. Please provide a valid month (1-12).' });
    return;
  }

  const data = await fetchTransactionData(month);
  
  if (!data) {
    res.status(500).json({ error: 'Error fetching transaction data.' });
    return;
  }

  res.json(data);
});

// API for statistics of the selected month
app.get('/api/statistics/:month', async (req, res) => {
  const month = parseInt(req.params.month) - 1;

  if (!isValidMonth(month)) {
    res.status(400).json({ error: 'Invalid month parameter. Please provide a valid month (1-12).' });
    return;
  }

  const data = await fetchTransactionData(month);

  if (!data) {
    res.status(500).json({ error: 'Error fetching transaction data.' });
    return;
  }

  const totalSaleAmount = data.reduce((total, item) => total + item.price, 0);
  const totalSoldItems = data.filter((item) => item.sold === true).length;
  const totalNotSoldItems = data.filter((item) => item.sold === false).length;

  res.json({
    totalSaleAmount,
    totalSoldItems,
    totalNotSoldItems,
  });
});

// API for bar chart data of the selected month
app.get('/api/bar-chart/:month', async (req, res) => {
  const month = parseInt(req.params.month, 10); 
  const data = await fetchTransactionData(month);

  if (!data) {
    res.status(500).json({ error: 'Error fetching transaction data.' });
    return;
  }

  const priceRanges = [
    { range: '0 - 100', count: 0 },
    { range: '101 - 200', count: 0 },
    { range: '201 - 300', count: 0 },
    { range: '301 - 400', count: 0 },
    { range: '401 - 500', count: 0 },
    { range: '501 - 600', count: 0 },
    { range: '601 - 700', count: 0 },
    { range: '701 - 800', count: 0 },
    { range: '801 - 900', count: 0 },
    { range: '901 - above', count: 0 },
  ];

  data.forEach((item) => {
    const price = item.price;
    let i = 0;
    while (i < priceRanges.length - 1 && price > priceRanges[i].range.split(' - ')[1]) {
      i++;
    }
    priceRanges[i].count++;
  });

  res.json(priceRanges);
});


// API for pie chart data of the selected month
app.get('/api/pie-chart/:month', async (req, res) => {
  const month = parseInt(req.params.month) - 1;

  const data = await fetchTransactionData(month);

  const categoryCountMap = new Map();
  data.forEach((item) => {
    const category = item.category;
    categoryCountMap.set(category, (categoryCountMap.get(category) || 0) + 1);
  });

  const pieChartData = Array.from(categoryCountMap.entries()).map(([category, count]) => ({
    category,
    count,
  }));

  res.send(pieChartData);
});
app.get('/api/combined-data/:month', async (req, res) => {
  const month = parseInt(req.params.month) - 1;

  if (!isValidMonth(month)) {
    res.status(400).json({ error: 'Invalid month parameter. Please provide a valid month (1-12).' });
    return;
  }

  try {
    const statisticsResponse = await fetch(`http://localhost:${PORT}/api/statistics/${month}`);
    if (!statisticsResponse.ok) {
      throw new Error('Error fetching statistics data');
    }
    const statisticsData = await statisticsResponse.json();

    const barChartDataResponse = await fetch(`http://localhost:${PORT}/api/bar-chart/${month}`);
    if (!barChartDataResponse.ok) {
      throw new Error('Error fetching bar chart data');
    }
    const barChartData = await barChartDataResponse.json();

    const pieChartDataResponse = await fetch(`http://localhost:${PORT}/api/pie-chart/${month}`);
    if (!pieChartDataResponse.ok) {
      throw new Error('Error fetching pie chart data');
    }
    const pieChartData = await pieChartDataResponse.json();

    // Combine all data into a single object
    const combinedData = {
      statistics: statisticsData,
      barChart: barChartData,
      pieChart: pieChartData,
    };

    // Send the combined data in a single response
    res.json(combinedData);
  } catch (error) {
    console.error('Error fetching combined data:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.use(express.static(__dirname));


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});