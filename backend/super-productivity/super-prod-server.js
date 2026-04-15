const express = require('express');
const path = require('path');
const app = express();
const PORT = 3900;

app.use(express.static(path.join(__dirname, 'dist/browser')));

app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist/browser/index.html'));
});

app.listen(PORT, () => {
  console.log(`Super Productivity serving on port ${PORT}`);
});