let vehicles = [];
let manualVehicleCount = 0;
let carData = null;

const CHART_COLORS = [
    '#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0',
    '#3D5475', '#546E7A', '#D4526E', '#8D5B4C', '#F86624'
];

function getBlendedEfficiency(vehicle) {
    const hwPct = parseInt(document.getElementById('driveMixSlider').value) / 100;
    const city = vehicle.city !== undefined ? vehicle.city : parseFloat(vehicle.efficiency);
    const highway = vehicle.highway !== undefined ? vehicle.highway : parseFloat(vehicle.efficiency);
    return city * (1 - hwPct) + highway * hwPct;
}

function updateDriveMixLabel() {
    const val = parseInt(document.getElementById('driveMixSlider').value);
    const cityPct = 100 - val;
    document.getElementById('driveMixLabel').textContent = `${cityPct}% City / ${val}% Highway`;
}

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

    let efficiency, type, year, make, model, city, highway;

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
        type = document.getElementById('vehicleType').value;
        const vData = carData[year][make][model];
        efficiency = vData.comb;
        city = vData.city;
        highway = vData.highway;
    } else {
        const vehicleTypeManual = document.getElementById('vehicleTypeManual');
        const vehicleEfficiencyManual = document.getElementById('vehicleEfficiencyManual');

        if (vehicleTypeManual.value === '' || vehicleEfficiencyManual.value === '') {
            alert('Please fill out all fields in the Manual tab.');
            return;
        }

        year = 'Select Year';
        make = 'Manual';
        efficiency = parseFloat(vehicleEfficiencyManual.value);
        type = vehicleTypeManual.value;
        manualVehicleCount++;
        model = `Manual Input #${manualVehicleCount}`;
        city = efficiency;
        highway = efficiency;
    }

    vehicles.push({ year, make, model, efficiency, type, city, highway });

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

        const color = CHART_COLORS[index % CHART_COLORS.length];
        listItem.style.border = `2px solid ${color}`;
        listItem.style.backgroundColor = color + '22';

        const badge = document.createElement('div');
        badge.className = 'mpg-badge';

        const blended = getBlendedEfficiency(vehicle);
        let labelText;
        if (vehicle.type === 'electric') {
            const evMPG = blended / (electricPrice / gasPrice);
            labelText = `${index + 1}. ${displayName}`;
            badge.classList.add('electric');
            const mpgeLine = document.createElement('div');
            mpgeLine.textContent = `${evMPG.toFixed(0)} MPGe`;
            const mikwhLine = document.createElement('div');
            mikwhLine.className = 'badge-sub';
            mikwhLine.textContent = `${blended.toFixed(2)} mi/kWh`;
            badge.appendChild(mpgeLine);
            badge.appendChild(mikwhLine);
        } else {
            labelText = `${index + 1}. ${displayName}`;
            badge.textContent = `${blended.toFixed(1)} MPG`;
            badge.classList.add('gas');
        }

        const labelSpan = document.createElement('span');
        labelSpan.textContent = labelText;

        if (isManual) {
            labelSpan.style.cursor = 'pointer';
            labelSpan.title = 'Click to rename';
            labelSpan.onclick = (function(i, idx) {
                return function() {
                    const nameInput = document.createElement('input');
                    nameInput.type = 'text';
                    nameInput.value = vehicles[i].model;
                    nameInput.style.cssText = 'display:inline;width:auto;margin:0;padding:2px 4px;font-size:inherit;';
                    labelSpan.textContent = `${idx + 1}. `;
                    labelSpan.appendChild(nameInput);
                    nameInput.focus();
                    nameInput.select();

                    function save() {
                        const newName = nameInput.value.trim();
                        if (newName) vehicles[i].model = newName;
                        renderVehicleList();
                        updateLineChart();
                        updateBarChart();
                    }

                    nameInput.addEventListener('blur', save);
                    nameInput.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            nameInput.blur();
                        } else if (e.key === 'Escape') {
                            nameInput.removeEventListener('blur', save);
                            renderVehicleList();
                        }
                    });
                };
            })(index, index);
        }

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
                vehicles[i].city = parsed;
                vehicles[i].highway = parsed;
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

document.getElementById('driveMixSlider').addEventListener('input', function() {
    updateDriveMixLabel();
    // Update efficiency preview if a model is currently selected
    if (carData) {
        const yearSel = document.getElementById('year-select');
        const makeSel = document.getElementById('make-select');
        const modelSel = document.getElementById('model-select');
        if (yearSel.value !== 'Select Year' && makeSel.value !== 'Select Make' && modelSel.value !== 'Select Model') {
            const vData = carData[yearSel.value][makeSel.value][modelSel.value];
            const hwPct = parseInt(this.value) / 100;
            document.getElementById('vehicleEfficiency').value = parseFloat((vData.city * (1 - hwPct) + vData.highway * hwPct).toFixed(4));
        }
    }
    refreshIfVehicles();
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
                const hwPct = parseInt(document.getElementById('driveMixSlider').value) / 100;
                efficiencyOutput.value = parseFloat((vehicle.city * (1 - hwPct) + vehicle.highway * hwPct).toFixed(4));
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
        const blended = getBlendedEfficiency(vehicle);
        for (let year = 1; year <= yearsOwnership; year++) {
            let cost;
            if (vehicle.type === 'gas') {
                cost = (milesYear / blended) * gasPrice * year;
            } else {
                cost = (milesYear / blended) * electricPrice * year;
            }
            data.push(Math.round(cost));
        }
        return {
            name: vehicle.model.split(' ').slice(0, 2).join(' '),
            data: data
        };
    });

    const lineOptions = {
        colors: vehicles.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
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
        const blended = getBlendedEfficiency(vehicle);
        if (vehicle.type === 'electric') {
            return (blended / (electricPrice / gasPrice)).toFixed(2);
        }
        return blended.toFixed(1);
    });

    const labelColors = vehicles.map(function(vehicle) {
        return vehicle.type === 'electric' ? '#1a7a1a' : '#000000';
    });

    chart.updateOptions({
        colors: vehicles.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        chart: {
            type: 'bar',
            height: '480px'
        },
        xaxis: {
            categories: vehicles.map(v => v.model.split(' ').slice(0, 2).join(' ')),
            labels: {
                style: { colors: labelColors }
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
