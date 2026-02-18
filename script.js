let vehicles = [];
let manualVehicleCount = 0;
let carData = null;

document.getElementById('addVehicleButton').addEventListener('click', function() {
    const gasPrice = parseFloat(document.getElementById('gasPrice').value);
    const electricPrice = parseFloat(document.getElementById('electricPrice').value);
    const milesYear = document.getElementById('milesYear').value;
    const yearsOwnership = document.getElementById('yearsOwnership').value;

    // Rates and Usage Input Validation (exists)
    const missingFields = [];
    if (!gasPrice) missingFields.push('Gas Price');
    if (!electricPrice) missingFields.push('Electric Price');
    if (!milesYear) missingFields.push('Miles per Year');
    if (!yearsOwnership) missingFields.push('Years of Ownership');

    if (missingFields.length > 0) {
        alert('Please enter the following fields: \n' + missingFields.join(', '));
        return;
    }

    // Rates and Usage Input Validation (Non-Negative)
    const invalidFields = [];
    if (gasPrice <= 0) invalidFields.push('Gas Price');
    if (electricPrice <= 0) invalidFields.push('Electric Price');
    if (milesYear <= 0) invalidFields.push('Miles per Year');
    if (yearsOwnership <= 0) invalidFields.push('Years of Ownership');

    if (invalidFields.length > 0) {
        alert('The following fields must be greater than zero: \n' + invalidFields.join(', '));
        return;
    }

    let efficiency, type, year, make, model;

    // Vehicle Input Validation and data collection
    if (activeTab === 'automatic') {
        const yearSelect = document.getElementById('year-select');
        const makeSelect = document.getElementById('make-select');
        const modelSelect = document.getElementById('model-select');

        if (yearSelect.value === 'Select Year' || makeSelect.value === 'Select Make' || modelSelect.value === 'Select Model') {
            alert('Please fill out all fields in the Automatic tab.');
            return;
        }

        year = yearSelect.value;
        make = makeSelect.value;
        model = modelSelect.value;
        efficiency = document.getElementById('vehicleEfficiency').value;
        type = document.getElementById('vehicleType').value;
    } else {
        const vehicleTypeManual = document.getElementById('vehicleTypeManual');
        const vehicleEfficiencyManual = document.getElementById('vehicleEfficiencyManual');

        if (vehicleTypeManual.value === '' || vehicleEfficiencyManual.value === '') {
            alert('Please fill out all fields in the Manual tab.');
            return;
        }

        year = 'Select Year';
        make = 'Manual';
        efficiency = vehicleEfficiencyManual.value;
        type = vehicleTypeManual.value;
        manualVehicleCount++;
        model = `Manual Input #${manualVehicleCount}`;
    }

    vehicles.push({ year, make, model, efficiency, type });

    // Reset input fields
    document.getElementById('year-select').value = 'Select Year';
    document.getElementById('make-select').innerHTML = '<option>Select Make</option>';
    document.getElementById('model-select').innerHTML = '<option>Select Model</option>';
    document.getElementById('vehicleEfficiency').value = '';
    document.getElementById('vehicleType').value = '';
    document.getElementById('vehicleTypeManual').value = '';
    document.getElementById('vehicleEfficiencyManual').value = '';

    renderVehicleList();
    updateLineChart();
    updateBarChart();
});

function renderVehicleList() {
    const gasPrice = parseFloat(document.getElementById('gasPrice').value);
    const electricPrice = parseFloat(document.getElementById('electricPrice').value);
    const vehicleList = document.getElementById('vehicleList');
    vehicleList.innerHTML = '';

    vehicles.forEach(function(vehicle, index) {
        const listItem = document.createElement('li');
        const isManual = vehicle.year === 'Select Year';
        const displayName = isManual ? vehicle.model : `${vehicle.make} ${vehicle.model}`;

        const badge = document.createElement('div');
        badge.className = 'mpg-badge';

        let labelText;
        if (vehicle.type === 'electric') {
            const evMPG = vehicle.efficiency / (electricPrice / gasPrice);
            labelText = `${index + 1}. ${displayName}`;
            badge.classList.add('electric');
            listItem.style.color = '#00c421';
            const mpgeLine = document.createElement('div');
            mpgeLine.textContent = `${evMPG.toFixed(0)} MPGe`;
            const mikwhLine = document.createElement('div');
            mikwhLine.className = 'badge-sub';
            mikwhLine.textContent = `${vehicle.efficiency} mi/kWh`;
            badge.appendChild(mpgeLine);
            badge.appendChild(mikwhLine);
        } else {
            labelText = `${index + 1}. ${displayName}`;
            badge.textContent = `${vehicle.efficiency} MPG`;
            badge.classList.add('gas');
        }

        const labelSpan = document.createElement('span');
        labelSpan.textContent = labelText;
        listItem.appendChild(labelSpan);
        listItem.appendChild(badge);

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.className = 'list-action-btn edit-btn';
        editButton.onclick = (function(v, i) {
            return function() {
                const unit = v.type === 'electric' ? 'Mi/KWh' : 'MPG';
                const newValue = prompt(`Enter new efficiency for ${displayName} (${unit}):`, v.efficiency);
                if (newValue === null) return; // user cancelled
                const parsed = parseFloat(newValue);
                if (isNaN(parsed) || parsed <= 0) {
                    alert('Please enter a valid positive number.');
                    return;
                }
                vehicles[i].efficiency = parsed;
                renderVehicleList();
                updateLineChart();
                updateBarChart();
            };
        })(vehicle, index);

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'list-action-btn remove-btn';
        removeButton.onclick = (function(i) {
            return function() {
                vehicles.splice(i, 1);
                renderVehicleList();
                updateLineChart();
                updateBarChart();
            };
        })(index);

        listItem.appendChild(editButton);
        listItem.appendChild(removeButton);
        vehicleList.appendChild(listItem);
    });
}

// Selection Tabs
var activeTab = 'automatic';

function showTab(tab) {
    document.getElementById(activeTab).classList.add('hidden');
    document.getElementById(tab).classList.remove('hidden');
    document.querySelector('.active-tab').classList.remove('active-tab');
    document.querySelector(`.tab[onclick="showTab('${tab}')"]`).classList.add('active-tab');
    activeTab = tab;
}

document.getElementById('vehicleEfficiencyManual').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('addVehicleButton').click();
});

function refreshIfVehicles() {
    if (vehicles.length === 0) return;
    renderVehicleList();
    updateLineChart();
    updateBarChart();
}

['gasPrice', 'electricPrice', 'milesYear', 'yearsOwnership'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', refreshIfVehicles);
});

document.addEventListener('DOMContentLoaded', function() {
    const yearSelect = document.getElementById('year-select');
    const makeSelect = document.getElementById('make-select');
    const modelSelect = document.getElementById('model-select');
    const efficiencyOutput = document.getElementById('vehicleEfficiency');
    const vehicleType = document.getElementById('vehicleType');

    fetch('Data/cars.json')
        .then(response => response.json())
        .then(data => {
            carData = data;

            for (const year in data) {
                let option = new Option(year, year);
                yearSelect.add(option);
            }

            yearSelect.addEventListener('change', function() {
                const selectedYear = yearSelect.value;
                const makes = data[selectedYear];
                makeSelect.innerHTML = '<option>Select Make</option>';
                for (const make in makes) {
                    let option = new Option(make, make);
                    makeSelect.add(option);
                }
            });

            makeSelect.addEventListener('change', function() {
                const selectedYear = yearSelect.value;
                const selectedMake = makeSelect.value;
                const models = data[selectedYear][selectedMake];
                modelSelect.innerHTML = '<option>Select Model</option>';
                for (const model in models) {
                    let option = new Option(model, model);
                    modelSelect.add(option);
                }
            });

            modelSelect.addEventListener('change', function() {
                const selectedYear = yearSelect.value;
                const selectedMake = makeSelect.value;
                const selectedModel = modelSelect.value;
                const vehicle = data[selectedYear][selectedMake][selectedModel];
                efficiencyOutput.value = vehicle.comb;
                vehicleType.value = vehicle.fuelType.toLowerCase().includes('electric') ? 'electric' : 'gas';
            });
        })
        .catch(function() {
            alert('Failed to load vehicle data. Please check your connection and refresh the page.');
        });
});

function updateLineChart() {
    const yearsOwnership = parseInt(document.getElementById('yearsOwnership').value) || 0;
    const milesYear = document.getElementById('milesYear').value;
    const gasPrice = document.getElementById('gasPrice').value;
    const electricPrice = document.getElementById('electricPrice').value;

    const lineSeries = vehicles.map(function(vehicle) {
        const data = [];
        for (let year = 1; year <= yearsOwnership; year++) {
            let cost;
            if (vehicle.type === 'gas') {
                cost = (milesYear / vehicle.efficiency) * gasPrice * year;
            } else {
                cost = (milesYear / vehicle.efficiency) * electricPrice * year;
            }
            data.push(Math.round(cost));
        }
        return {
            name: vehicle.model.split(' ').slice(0, 2).join(' '),
            data: data
        };
    });

    const lineOptions = {
        chart: {
            type: 'line',
            height: '510px'
        },
        series: lineSeries,
        xaxis: {
            title: {
                text: 'Years',
                style: { fontSize: '20px' },
                offsetY: -40,
            },
            labels: { style: { fontSize: '20px' } },
            categories: Array.from({ length: yearsOwnership }, (_, i) => i + 1),
        },
        yaxis: {
            title: {
                text: 'Total Fuel Cost',
                style: { fontSize: '20px' }
            },
            labels: { style: { fontSize: '20px' } }
        },
        legend: { fontSize: '20px' },
    };

    lineChart.updateSeries(lineSeries);
    lineChart.updateOptions(lineOptions);
}

function updateBarChart() {
    const gasPrice = parseFloat(document.getElementById('gasPrice').value);
    const electricPrice = parseFloat(document.getElementById('electricPrice').value);

    const vehicleEfficiencies = vehicles.map(function(vehicle) {
        let efficiency = vehicle.efficiency;
        if (vehicle.type === 'electric') {
            efficiency = (efficiency / (electricPrice / gasPrice)).toFixed(2);
        }
        return efficiency;
    });

    const vehicleColors = vehicles.map(function(vehicle) {
        return vehicle.type === 'electric' ? '#72b644' : '#000000';
    });

    chart.updateOptions({
        chart: {
            type: 'bar',
            height: '480px'
        },
        xaxis: {
            categories: vehicles.map(v => v.model.split(' ').slice(0, 2).join(' ')),
            labels: {
                style: { colors: vehicleColors }
            }
        }
    });

    chart.updateSeries([{
        data: vehicleEfficiencies
    }]);
}

function showTooltip(id) {
    const tooltip = document.getElementById(id);
    tooltip.style.display = 'block';
    setTimeout(function() {
        tooltip.style.display = 'none';
    }, 3000);
}
