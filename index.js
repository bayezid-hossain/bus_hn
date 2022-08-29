const express = require('express');

const app = express();
app.use(express.json());

app.listen(8005, () => {
  console.log('bus is listening to port 8005');
});
