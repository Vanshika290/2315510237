const express = require('express');
const vehicles = require('./vehicles');
const app = express();

app.use(express.json());
app.post('/vehicles', (req, res) => {
    const vehicle = req.body;
    vehicles.push(vehicle);
    res.status(201).json(vehicle);
});

app.get('/vehicles', (req, res) => {
    res.json(vehicles);
});
app.get('/vehicles/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json(vehicle);
});
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
