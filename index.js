const express = require('express');
const app = express();
const PORT = 3013;

app.use(express.json());

// Function to fetch data from the third-party API
async function fetchTransactionData() {
  try {
    const response = await fetch('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    return response.json();
  } catch (error) {
    console.error('Error fetching data:', error.message);
    return null;
  }
}

app.get('/', async (req, res) => {
  const data = await fetchTransactionData();
  res.send({ message: 'Database initialized with seed data.' });
});

// API for statistics of the selected month
app.get('/api/statistics/:month', async (req, res) => {
  const month = parseInt(req.params.month) - 1; 
  const data = await fetchTransactionData();
  const filteredData = data.filter((item) => new Date(item.dateOfSale).getMonth() === month);

  const totalSaleAmount = filteredData.reduce((total, item) => total + item.price, 0);
  const totalSoldItems = filteredData.filter((item) => item.sold === true).length;
  const totalNotSoldItems = filteredData.filter((item) => item.sold === false).length;

  res.json({
    totalSaleAmount,
    totalSoldItems,
    totalNotSoldItems,
  });
});

// API for bar chart data of the selected month
app.get('/api/bar-chart/:month', async (req, res) => {
  const month = parseInt(req.params.month) - 1; 
  const data = await fetchTransactionData();
  const filteredData = data.filter((item) => new Date(item.dateOfSale).getMonth() === month);

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

  filteredData.forEach((item) => {
    const price = item.price;
    let i = 0;
    while (i < priceRanges.length - 1 && price > priceRanges[i].range.split(' - ')[1]) {
      i++;
    }
    priceRanges[i].count++;
  });
  
  res.send(priceRanges);
});

// API for pie chart data of the selected month
app.get('/api/pie-chart/:month', async (req, res) => {
  const month = parseInt(req.params.month) - 1; 
  const data = await fetchTransactionData();
  const filteredData = data.filter((item) => new Date(item.dateOfSale).getMonth() === month);

  const categoryCountMap = new Map();
  filteredData.forEach((item) => {
    const category = item.category;
    categoryCountMap.set(category, (categoryCountMap.get(category) || 0) + 1);
  });

  const pieChartData = Array.from(categoryCountMap.entries()).map(([category, count]) => ({
    category,
    count,
  }));

  res.send(pieChartData);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
