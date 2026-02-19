let vehicles = [];
let manualVehicleCount = 0;
let carData = null;
let pendingAddVehicle = false;

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

function updateMilesYearLabel() {
    const val = parseInt(document.getElementById('milesYear').value);
    document.getElementById('milesYearLabel').textContent = val.toLocaleString() + ' miles/year';
}

function updateYearsOwnershipLabel() {
    const val = parseInt(document.getElementById('yearsOwnership').value);
    document.getElementById('yearsOwnershipLabel').textContent = val + (val === 1 ? ' year' : ' years');
}

function updateDriveMixLabel() {
    const val = parseInt(document.getElementById('driveMixSlider').value);
    const cityPct = 100 - val;
    document.getElementById('driveMixLabel').textContent = `${cityPct}% City / ${val}% Highway`;
}

function updateChargingMixLabel() {
    const val = parseInt(document.getElementById('chargingMixSlider').value);
    document.getElementById('chargingMixLabel').textContent = `${100 - val}% Home / ${val}% DC Fast`;
}

function getBlendedElectricPrice() {
    const electricPrice = parseFloat(document.getElementById('electricPrice').value) || 0;
    const dcFastRaw = parseFloat(document.getElementById('dcFastPrice').value);
    const dcFastPrice = (isNaN(dcFastRaw) || dcFastRaw <= 0) ? electricPrice : dcFastRaw;
    const dcFastPct = parseInt(document.getElementById('chargingMixSlider').value) / 100;
    return (1 - dcFastPct) * electricPrice + dcFastPct * dcFastPrice;
}

document.getElementById('addVehicleButton').addEventListener('click', function() {
    const gasPrice = parseFloat(document.getElementById('gasPrice').value);
    const premiumGasPrice = parseFloat(document.getElementById('premiumGasPrice').value);
    const electricPrice = parseFloat(document.getElementById('electricPrice').value);
    const milesYear = document.getElementById('milesYear').value;
    const yearsOwnership = document.getElementById('yearsOwnership').value;

    // Rates and Usage Input Validation (exists)
    const missingFields = [];
    if (!gasPrice) missingFields.push('Regular Gasoline');
    if (!premiumGasPrice) missingFields.push('Premium Gasoline');
    if (!electricPrice) missingFields.push('Home Price per kWh');

    if (missingFields.length > 0) {
        pendingAddVehicle = true;
        document.getElementById('fuelPriceModal').classList.remove('hidden');
        return;
    }

    // Rates and Usage Input Validation (Non-Negative)
    const invalidFields = [];
    if (gasPrice <= 0) invalidFields.push('Regular Gasoline');
    if (premiumGasPrice <= 0) invalidFields.push('Premium Gasoline');
    if (electricPrice <= 0) invalidFields.push('Home Price per kWh');
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
        const customName = document.getElementById('vehicleNameManual').value.trim();
        model = customName || `Manual Input #${manualVehicleCount}`;
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
    document.getElementById('vehicleDetails').classList.add('hidden');
    document.getElementById('vehicleNameManual').value = '';
    document.getElementById('vehicleTypeManual').value = '';
    document.getElementById('vehicleEfficiencyManual').value = '';

    renderVehicleList();
    updateLineChart();
});

function renderVehicleList() {
    const gasPrice = parseFloat(document.getElementById('gasPrice').value);
    const electricPrice = getBlendedElectricPrice();
    const vehicleList = document.getElementById('vehicleList');
    vehicleList.innerHTML = '';
    const noVehiclesMsg = document.getElementById('noVehiclesMsg');
    noVehiclesMsg.style.display = vehicles.length === 0 ? 'block' : 'none';

    // Pre-compute display efficiency (MPGe) for each vehicle to size the bars
    const displayEfficiencies = vehicles.map(vehicle => {
        const blended = getBlendedEfficiency(vehicle);
        if (vehicle.type === 'electric') {
            const ratio = (electricPrice > 0 && gasPrice > 0) ? (electricPrice / gasPrice) : 1;
            return blended / ratio;
        }
        return blended;
    });
    const maxEff = Math.max(...displayEfficiencies, 0.001);

    vehicles.forEach(function(vehicle, index) {
        const listItem = document.createElement('li');
        const isManual = vehicle.year === 'Select Year';
        const displayName = isManual ? vehicle.model : `${vehicle.make} ${vehicle.model}`;

        const color = CHART_COLORS[index % CHART_COLORS.length];
        const barPct = (displayEfficiencies[index] / maxEff * 100).toFixed(1);
        listItem.style.border = `2px solid ${color}`;
        listItem.style.background = `linear-gradient(to right, ${color}33 ${barPct}%, #f5f5f5 ${barPct}%)`;

        const badge = document.createElement('div');
        badge.className = 'mpg-badge';

        const blended = getBlendedEfficiency(vehicle);
        let labelText;
        if (vehicle.type === 'electric') {
            const evMPG = blended / (electricPrice / gasPrice);
            labelText = displayName;
            badge.classList.add('electric');
            const mpgeLine = document.createElement('div');
            mpgeLine.textContent = `${evMPG.toFixed(0)} MPGe`;
            const mikwhLine = document.createElement('div');
            mikwhLine.className = 'badge-sub';
            mikwhLine.textContent = `${blended.toFixed(2)} mi/kWh`;
            badge.appendChild(mpgeLine);
            badge.appendChild(mikwhLine);
        } else {
            labelText = displayName;
            badge.textContent = `${blended.toFixed(1)} MPG`;
            badge.classList.add(vehicle.type === 'premium' ? 'premium' : 'gas');
        }

        // Make badge clickable for inline efficiency editing
        badge.style.cursor = 'pointer';
        badge.title = 'Click to edit efficiency';
        badge.addEventListener('click', (function(v, i) {
            return function() {
                const unit = v.type === 'electric' ? 'mi/kWh' : 'MPG';
                const input = document.createElement('input');
                input.type = 'number';
                input.value = v.efficiency;
                input.min = '0.01';
                input.step = 'any';
                input.style.cssText = 'width:70px;font-size:0.9em;padding:2px 4px;margin:0;display:inline-block;text-align:center;';
                const unitLabel = document.createElement('div');
                unitLabel.style.fontSize = '0.75em';
                unitLabel.textContent = unit;
                badge.innerHTML = '';
                badge.appendChild(input);
                badge.appendChild(unitLabel);
                input.focus();
                input.select();

                function save() {
                    const parsed = parseFloat(input.value);
                    if (!isNaN(parsed) && parsed > 0) {
                        vehicles[i].efficiency = parsed;
                        vehicles[i].city = parsed;
                        vehicles[i].highway = parsed;
                    }
                    renderVehicleList();
                    updateLineChart();
                }

                input.addEventListener('blur', save);
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') input.blur();
                    else if (e.key === 'Escape') {
                        input.removeEventListener('blur', save);
                        renderVehicleList();
                    }
                });
            };
        })(vehicle, index));

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
            };
        })(index);

        listItem.appendChild(editButton);
        listItem.appendChild(removeButton);
        vehicleList.appendChild(listItem);
    });

    // Scale legend
    const legend = document.getElementById('vehicleListLegend');
    if (vehicles.length === 0) {
        legend.innerHTML = '';
        return;
    }
    const ticks = 5;
    let html = '<div class="list-legend">';
    for (let i = 0; i < ticks; i++) {
        const pct = (i / (ticks - 1)) * 100;
        const val = Math.round(maxEff * pct / 100);
        html += `<div class="list-legend-tick" style="left:${pct}%">
            <div class="list-legend-line"></div>
            <div class="list-legend-val">${val}</div>
        </div>`;
    }
    html += '</div><div class="list-legend-label">MPG/MPGe</div>';
    legend.innerHTML = html;
}

// Fuel price modal
function closeFuelPriceModal() {
    document.getElementById('fuelPriceModal').classList.add('hidden');
}

document.getElementById('modalAutofillBtn').addEventListener('click', function() {
    closeFuelPriceModal();
    autofillFuelPrices();
});

document.getElementById('modalManualBtn').addEventListener('click', function() {
    pendingAddVehicle = false;
    closeFuelPriceModal();
    document.getElementById('gasPrice').focus();
});

document.getElementById('fuelPriceModal').addEventListener('click', function(e) {
    if (e.target === this) {
        pendingAddVehicle = false;
        closeFuelPriceModal();
    }
});

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
}

['gasPrice', 'premiumGasPrice', 'electricPrice', 'dcFastPrice'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', function() {
        refreshIfVehicles();
        const btn = document.getElementById('autofillPricesBtn');
        if (btn && !btn.disabled) {
            btn.textContent = 'Auto-fill Prices by Location';
        }
    });
});

document.getElementById('milesYear').addEventListener('input', function() {
    updateMilesYearLabel();
    refreshIfVehicles();
});

document.getElementById('yearsOwnership').addEventListener('input', function() {
    updateYearsOwnershipLabel();
    refreshIfVehicles();
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

            for (const year of Object.keys(data).sort((a, b) => b - a)) {
                let option = new Option(year, year);
                yearSelect.add(option);
            }

            yearSelect.addEventListener('change', function() {
                const selectedYear = yearSelect.value;
                const makes = data[selectedYear];
                makeSelect.innerHTML = '<option>Select Make</option>';
                modelSelect.innerHTML = '<option>Select Model</option>';
                document.getElementById('vehicleDetails').classList.add('hidden');
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
                document.getElementById('vehicleDetails').classList.add('hidden');
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
                const ft = vehicle.fuelType.toLowerCase();
                if (ft.includes('electric')) {
                    vehicleType.value = 'electric';
                } else if (ft.includes('premium')) {
                    vehicleType.value = 'premium';
                } else {
                    vehicleType.value = 'gas';
                }
                document.getElementById('vehicleDetails').classList.remove('hidden');
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
    const premiumGasPrice = document.getElementById('premiumGasPrice').value;
    const blendedElectricPrice = getBlendedElectricPrice();

    const lineSeries = vehicles.map(function(vehicle) {
        const data = [];
        const blended = getBlendedEfficiency(vehicle);
        for (let year = 1; year <= yearsOwnership; year++) {
            let cost;
            if (vehicle.type === 'premium') {
                cost = (milesYear / blended) * premiumGasPrice * year;
            } else if (vehicle.type === 'gas') {
                cost = (milesYear / blended) * gasPrice * year;
            } else {
                cost = (milesYear / blended) * blendedElectricPrice * year;
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
            labels: {
                style: { fontSize: '20px' },
                formatter: function(val) {
                    return '$' + Math.round(val).toLocaleString();
                }
            }
        },
        dataLabels: {
            formatter: function(val) {
                return '$' + val.toLocaleString();
            }
        },
        tooltip: {
            y: {
                formatter: function(val) {
                    return '$' + val.toLocaleString();
                }
            }
        },
        legend: { fontSize: '20px' },
    };

    lineChart.updateSeries(lineSeries);
    lineChart.updateOptions(lineOptions);
}

// State-level average fuel prices (EIA 2024 data, regular $/gal, premium $/gal, electric $/kWh; DC fast charge $/kWh from AAA)
const STATE_PRICES = {
    AK: { gas: 3.65, premium: 4.20, electric: 0.24, dcFast: 0.486 }, AL: { gas: 2.95, premium: 3.50, electric: 0.13, dcFast: 0.416 },
    AR: { gas: 2.90, premium: 3.45, electric: 0.11, dcFast: 0.395 }, AZ: { gas: 3.45, premium: 4.00, electric: 0.13, dcFast: 0.411 },
    CA: { gas: 4.70, premium: 5.25, electric: 0.27, dcFast: 0.427 }, CO: { gas: 3.25, premium: 3.80, electric: 0.14, dcFast: 0.342 },
    CT: { gas: 3.45, premium: 4.00, electric: 0.28, dcFast: 0.392 }, DC: { gas: 3.30, premium: 3.85, electric: 0.14, dcFast: 0.373 },
    DE: { gas: 3.05, premium: 3.60, electric: 0.14, dcFast: 0.340 }, FL: { gas: 3.20, premium: 3.75, electric: 0.14, dcFast: 0.395 },
    GA: { gas: 2.90, premium: 3.45, electric: 0.13, dcFast: 0.409 }, HI: { gas: 4.80, premium: 5.35, electric: 0.39, dcFast: 0.502 },
    IA: { gas: 3.00, premium: 3.55, electric: 0.12, dcFast: 0.323 }, ID: { gas: 3.35, premium: 3.90, electric: 0.11, dcFast: 0.423 },
    IL: { gas: 3.50, premium: 4.05, electric: 0.15, dcFast: 0.409 }, IN: { gas: 3.15, premium: 3.70, electric: 0.14, dcFast: 0.383 },
    KS: { gas: 2.95, premium: 3.50, electric: 0.13, dcFast: 0.257 }, KY: { gas: 2.95, premium: 3.50, electric: 0.12, dcFast: 0.394 },
    LA: { gas: 2.90, premium: 3.45, electric: 0.10, dcFast: 0.477 }, MA: { gas: 3.25, premium: 3.80, electric: 0.26, dcFast: 0.365 },
    MD: { gas: 3.15, premium: 3.70, electric: 0.16, dcFast: 0.331 }, ME: { gas: 3.30, premium: 3.85, electric: 0.22, dcFast: 0.394 },
    MI: { gas: 3.20, premium: 3.75, electric: 0.17, dcFast: 0.343 }, MN: { gas: 3.10, premium: 3.65, electric: 0.14, dcFast: 0.353 },
    MO: { gas: 2.90, premium: 3.45, electric: 0.12, dcFast: 0.280 }, MS: { gas: 2.85, premium: 3.40, electric: 0.13, dcFast: 0.409 },
    MT: { gas: 3.25, premium: 3.80, electric: 0.12, dcFast: 0.398 }, NC: { gas: 3.00, premium: 3.55, electric: 0.12, dcFast: 0.376 },
    ND: { gas: 3.05, premium: 3.60, electric: 0.12, dcFast: 0.379 }, NE: { gas: 3.05, premium: 3.60, electric: 0.11, dcFast: 0.302 },
    NH: { gas: 3.15, premium: 3.70, electric: 0.25, dcFast: 0.443 }, NJ: { gas: 3.25, premium: 3.80, electric: 0.18, dcFast: 0.430 },
    NM: { gas: 3.00, premium: 3.55, electric: 0.14, dcFast: 0.336 }, NV: { gas: 3.80, premium: 4.35, electric: 0.12, dcFast: 0.380 },
    NY: { gas: 3.50, premium: 4.05, electric: 0.21, dcFast: 0.386 }, OH: { gas: 3.15, premium: 3.70, electric: 0.13, dcFast: 0.405 },
    OK: { gas: 2.85, premium: 3.40, electric: 0.11, dcFast: 0.408 }, OR: { gas: 3.80, premium: 4.35, electric: 0.12, dcFast: 0.355 },
    PA: { gas: 3.35, premium: 3.90, electric: 0.16, dcFast: 0.395 }, RI: { gas: 3.20, premium: 3.75, electric: 0.26, dcFast: 0.369 },
    SC: { gas: 2.95, premium: 3.50, electric: 0.13, dcFast: 0.447 }, SD: { gas: 3.10, premium: 3.65, electric: 0.12, dcFast: 0.343 },
    TN: { gas: 2.95, premium: 3.50, electric: 0.12, dcFast: 0.421 }, TX: { gas: 2.85, premium: 3.40, electric: 0.13, dcFast: 0.365 },
    UT: { gas: 3.35, premium: 3.90, electric: 0.11, dcFast: 0.317 }, VA: { gas: 3.10, premium: 3.65, electric: 0.13, dcFast: 0.378 },
    VT: { gas: 3.25, premium: 3.80, electric: 0.19, dcFast: 0.325 }, WA: { gas: 4.00, premium: 4.55, electric: 0.11, dcFast: 0.365 },
    WI: { gas: 3.10, premium: 3.65, electric: 0.16, dcFast: 0.402 }, WV: { gas: 3.10, premium: 3.65, electric: 0.12, dcFast: 0.522 },
    WY: { gas: 3.20, premium: 3.75, electric: 0.10, dcFast: 0.271 }
};

const STATE_NAME_TO_CODE = {
    'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
    'Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA',
    'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA',
    'Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD',
    'Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO',
    'Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ',
    'New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH',
    'Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC',
    'South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT',
    'Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY',
    'District of Columbia':'DC'
};

async function autofillFuelPrices() {
    const btn = document.getElementById('autofillPricesBtn');
    btn.textContent = 'Detecting location...';
    btn.disabled = true;

    function resetBtn(text) {
        btn.textContent = text;
        btn.disabled = false;
    }

    try {
        if (!navigator.geolocation) {
            resetBtn('Location not supported');
            setTimeout(() => resetBtn('Auto-fill Prices by Location'), 3000);
            return;
        }

        let coords;
        try {
            const pos = await new Promise((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
            );
            coords = pos.coords;
        } catch (e) {
            resetBtn('Location denied — try again');
            setTimeout(() => resetBtn('Auto-fill Prices by Location'), 3000);
            return;
        }

        let stateCode;
        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
                { headers: { 'Accept': 'application/json', 'User-Agent': 'EV-MPG-App/1.0' } }
            );
            const geo = await resp.json();
            const iso = geo.address && geo.address['ISO3166-2-lvl4'];
            if (iso && iso.startsWith('US-')) {
                stateCode = iso.slice(3);
            } else {
                stateCode = geo.address && STATE_NAME_TO_CODE[geo.address.state];
            }
        } catch (e) {
            resetBtn('Lookup failed — try again');
            setTimeout(() => resetBtn('Auto-fill Prices by Location'), 3000);
            return;
        }

        const prices = stateCode && STATE_PRICES[stateCode];
        if (!prices) {
            resetBtn('State not found — try again');
            setTimeout(() => resetBtn('Auto-fill Prices by Location'), 3000);
            return;
        }

        document.getElementById('gasPrice').value = prices.gas;
        document.getElementById('premiumGasPrice').value = prices.premium;
        document.getElementById('electricPrice').value = prices.electric;
        document.getElementById('dcFastPrice').value = prices.dcFast;
        if (pendingAddVehicle) {
            pendingAddVehicle = false;
            document.getElementById('addVehicleButton').click();
        } else {
            refreshIfVehicles();
        }
        resetBtn(`2024 ${stateCode} Average Prices`);
    } catch (e) {
        resetBtn('Auto-fill Prices by Location');
    }
}

