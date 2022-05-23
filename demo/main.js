const switcher = require('..').default;
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json())
app.use(new switcher());

app.listen(3000);