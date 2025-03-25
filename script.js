// Global variables
let csvData = [];
let headers = [];
let currentPage = 1;
let rowsPerPage = 25;
let searchTerm = '';
let charts = {};
let parseConfig = {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Event listeners for UI interactions
    document.getElementById('uploadBtn').addEventListener('click', function() {
        document.getElementById('fileInput').click();
    });

    // Hero upload button
    document.getElementById('heroUploadBtn').addEventListener('click', function() {
        document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', handleFileUpload);

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Data explorer pagination
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderDataTable();
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(getFilteredData().length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderDataTable();
        }
    });

    document.getElementById('rowsPerPage').addEventListener('change', function() {
        rowsPerPage = parseInt(this.value);
        currentPage = 1;
        renderDataTable();
    });

    document.getElementById('searchData').addEventListener('input', function() {
        searchTerm = this.value.toLowerCase();
        currentPage = 1;
        renderDataTable();
    });

    // Column selector change events
    document.getElementById('columnSelector').addEventListener('change', function() {
        analyzeColumn(this.value);
    });

    document.getElementById('generateChart').addEventListener('click', generateVisualization);

    document.getElementById('distributionColumnSelector').addEventListener('change', function() {
        generateDistributionChart(this.value);
    });

    // Report buttons
    document.getElementById('generateReport').addEventListener('click', generateTextReport);
    document.getElementById('copyReport').addEventListener('click', copyTextReport);
    document.getElementById('downloadReport').addEventListener('click', downloadTextReport);
    document.getElementById('exportCSV').addEventListener('click', exportProcessedCSV);
    document.getElementById('exportJSON').addEventListener('click', exportAsJSON);
});

// File upload handler
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('fileName').textContent = file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            
            // Show loading indicator
            document.getElementById('fileName').textContent = `Analyzing ${file.name}...`;
            
            // Parse CSV using Papa Parse
            Papa.parse(csvText, {
                ...parseConfig,
                complete: function(results) {
                    processCSVData(results);
                },
                error: function(error) {
                    alert('Error parsing CSV file: ' + error.message);
                    console.error(error);
                    document.getElementById('fileName').textContent = file.name;
                }
            });
        } catch (error) {
            alert('Error reading the CSV file: ' + error.message);
            console.error(error);
            document.getElementById('fileName').textContent = file.name;
        }
    };
    
    reader.onerror = function() {
        alert('Failed to read the file');
        document.getElementById('fileName').textContent = file.name;
    };
    
    reader.readAsText(file);
}

// Process CSV data
function processCSVData(results) {
    if (results.errors.length > 0) {
        console.warn('CSV parsing had some errors:', results.errors);
    }
    
    csvData = results.data;
    
    if (csvData.length === 0) {
        alert('No data found in the CSV file');
        return;
    }
    
    // Get headers
    headers = Object.keys(csvData[0] || {});
    
    // Show the main content after successful upload
    document.getElementById('mainContent').classList.remove('hidden');
    
    // Update file name display
    document.getElementById('fileName').textContent = document.getElementById('fileInput').files[0].name;
    
    // Switch to the Overview tab
    switchTab('overview');
    
    // Generate overviews
    generateFileOverview();
    populateColumnSelector();
    analyzeColumn(headers[0] || '');
    renderDataTable();
    analyzeStatistics();
    populateAxisSelectors();
    populateDistributionColumnSelector();
    
    // Scroll to results
    document.getElementById('mainContent').scrollIntoView({ behavior: 'smooth' });
}

// Populate column selector dropdown
function populateColumnSelector() {
    const columnSelector = document.getElementById('columnSelector');
    columnSelector.innerHTML = '';
    
    headers.forEach(header => {
        const option = document.createElement('option');
        option.value = header;
        option.textContent = header;
        columnSelector.appendChild(option);
    });
}

// Populate axis selectors for visualization
function populateAxisSelectors() {
    const xAxisSelector = document.getElementById('xAxisSelector');
    const yAxisSelector = document.getElementById('yAxisSelector');
    
    xAxisSelector.innerHTML = '';
    yAxisSelector.innerHTML = '';
    
    headers.forEach(header => {
        const xOption = document.createElement('option');
        xOption.value = header;
        xOption.textContent = header;
        xAxisSelector.appendChild(xOption);
        
        const yOption = document.createElement('option');
        yOption.value = header;
        yOption.textContent = header;
        yAxisSelector.appendChild(yOption);
    });
    
    // Set default Y-axis to the second column if available
    if (headers.length > 1) {
        yAxisSelector.value = headers[1];
    }
}

// Populate distribution column selector
function populateDistributionColumnSelector() {
    const distributionColumnSelector = document.getElementById('distributionColumnSelector');
    distributionColumnSelector.innerHTML = '';
    
    headers.forEach(header => {
        const option = document.createElement('option');
        option.value = header;
        option.textContent = header;
        distributionColumnSelector.appendChild(option);
    });
    
    // Generate distribution chart for the first column by default
    if (headers.length > 0) {
        generateDistributionChart(headers[0]);
    }
}

// Switch between tabs
function switchTab(tabId) {
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show the selected tab content
    document.getElementById(tabId).classList.add('active');
    
    // Add active class to the clicked tab
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
}

// Generate file overview
function generateFileOverview() {
    const fileInfo = document.getElementById('fileInfo');
    const quickStats = document.getElementById('quickStats');
    const columnOverview = document.getElementById('columnOverview');
    
    // File information
    let fileInfoHTML = `
        <div class="stat-card">
            <h4>File Properties</h4>
            <p><strong>File Name:</strong> ${document.getElementById('fileName').textContent}</p>
            <p><strong>Number of Columns:</strong> ${headers.length}</p>
            <p><strong>Number of Rows:</strong> ${csvData.length}</p>
            <p><strong>File Size:</strong> ${formatFileSize(document.getElementById('fileInput').files[0].size)}</p>
        </div>
    `;
    
    fileInfo.innerHTML = fileInfoHTML;
    
    // Quick statistics
    let totalCells = csvData.length * headers.length;
    let nonEmptyCells = 0;
    let numericCells = 0;
    let textCells = 0;
    
    csvData.forEach(row => {
        headers.forEach(header => {
            const value = row[header];
            if (value !== null && value !== undefined && value !== '') {
                nonEmptyCells++;
                
                if (typeof value === 'number') {
                    numericCells++;
                } else if (typeof value === 'string') {
                    textCells++;
                }
            }
        });
    });
    
    const statsHTML = `
        <div class="flex-item stat-card">
            <h4>Total Rows</h4>
            <div class="stat-value">${csvData.length.toLocaleString()}</div>
        </div>
        <div class="flex-item stat-card">
            <h4>Total Columns</h4>
            <div class="stat-value">${headers.length.toLocaleString()}</div>
        </div>
        <div class="flex-item stat-card">
            <h4>Data Density</h4>
            <div class="stat-value">${Math.round((nonEmptyCells / totalCells) * 100)}%</div>
            <p>${nonEmptyCells.toLocaleString()} non-empty cells</p>
        </div>
        <div class="flex-item stat-card">
            <h4>Data Types</h4>
            <p><strong>Numeric:</strong> ${numericCells.toLocaleString()} (${Math.round((numericCells / nonEmptyCells) * 100)}%)</p>
            <p><strong>Text:</strong> ${textCells.toLocaleString()} (${Math.round((textCells / nonEmptyCells) * 100)}%)</p>
            <p><strong>Other:</strong> ${(nonEmptyCells - numericCells - textCells).toLocaleString()}</p>
        </div>
    `;
    
    quickStats.innerHTML = statsHTML;
    
    // Column overview
    let columnHTML = '<table><tr><th>Column</th><th>Type</th><th>Non-Empty</th><th>Empty %</th></tr>';
    
    headers.forEach(header => {
        let columnStats = {
            total: csvData.length,
            nonEmpty: 0,
            types: {
                number: 0,
                string: 0,
                boolean: 0,
                other: 0
            }
        };
        
        csvData.forEach(row => {
            const value = row[header];
            if (value !== null && value !== undefined && value !== '') {
                columnStats.nonEmpty++;
                
                if (typeof value === 'number') {
                    columnStats.types.number++;
                } else if (typeof value === 'string') {
                    columnStats.types.string++;
                } else if (typeof value === 'boolean') {
                    columnStats.types.boolean++;
                } else {
                    columnStats.types.other++;
                }
            }
        });
        
        // Determine dominant type
        let dominantType = 'text';
        let maxTypeCount = columnStats.types.string;
        
        if (columnStats.types.number > maxTypeCount) {
            dominantType = 'numeric';
            maxTypeCount = columnStats.types.number;
        }
        
        if (columnStats.types.boolean > maxTypeCount) {
            dominantType = 'boolean';
            maxTypeCount = columnStats.types.boolean;
        }
        
        const emptyPercentage = ((columnStats.total - columnStats.nonEmpty) / columnStats.total) * 100;
        const badgeClass = emptyPercentage > 50 ? 'badge-danger' : 
                        emptyPercentage > 20 ? 'badge-warning' : 
                        emptyPercentage > 5 ? 'badge-primary' : 
                        'badge-success';
        
        columnHTML += `
            <tr>
                <td>${header}</td>
                <td>${dominantType}</td>
                <td>${columnStats.nonEmpty}/${columnStats.total}</td>
                <td><span class="badge ${badgeClass}">${emptyPercentage.toFixed(1)}%</span></td>
            </tr>
        `;
    });
    
    columnHTML += '</table>';
    columnOverview.innerHTML = columnHTML;
}

// Format file size in human-readable format
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Render data table with pagination and search
function renderDataTable() {
    const dataTable = document.getElementById('dataTable');
    const pageInfo = document.getElementById('pageInfo');
    
    // Get the filtered data
    const data = getFilteredData();
    
    // Calculate pagination information
    const totalRows = data.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    currentPage = Math.min(currentPage, totalPages || 1);
    
    // Update page info
    pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    
    // Get the rows for the current page
    const startRow = (currentPage - 1) * rowsPerPage;
    const endRow = Math.min(startRow + rowsPerPage, totalRows);
    const pageData = data.slice(startRow, endRow);
    
    // Create the table
    let tableHTML = '<table>';
    
    // Headers
    tableHTML += '<thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead>';
    
    // Body
    tableHTML += '<tbody>';
    if (pageData.length > 0) {
        pageData.forEach(row => {
            tableHTML += '<tr>';
            headers.forEach(header => {
                const cellValue = row[header];
                tableHTML += `<td>${formatCellValue(cellValue)}</td>`;
            });
            tableHTML += '</tr>';
        });
    } else {
        tableHTML += `<tr><td colspan="${headers.length}" style="text-align: center;">No data to display</td></tr>`;
    }
    tableHTML += '</tbody></table>';
    
    // Display the table
    dataTable.innerHTML = tableHTML;
}

// Get filtered data based on search term
function getFilteredData() {
    if (!searchTerm) {
        return csvData;
    }
    
    // Filter rows based on search term
    return csvData.filter(row => {
        return headers.some(header => {
            const value = row[header];
            return value !== null && 
                   value !== undefined && 
                   formatCellValue(value).toLowerCase().includes(searchTerm);
        });
    });
}

// Format cell value for display
function formatCellValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    
    if (value instanceof Date) {
        return value.toLocaleString();
    }
    
    if (typeof value === 'number') {
        return value.toLocaleString();
    }
    
    return String(value);
}

// Analyze column
function analyzeColumn(columnName) {
    const columnAnalysis = document.getElementById('columnAnalysis');
    
    if (!columnName || csvData.length === 0) {
        columnAnalysis.innerHTML = '<p>No data available for analysis</p>';
        return;
    }
    
    // Get column values
    const columnValues = csvData.map(row => row[columnName]);
    
    // Determine column type
    const valueTypes = columnValues.map(value => {
        if (value === null || value === undefined || value === '') return 'empty';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        if (value instanceof Date) return 'date';
        return 'string';
    });
    
    const typeCounts = {};
    valueTypes.forEach(type => {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    // Determine dominant type
    let dominantType = 'string';
    let maxCount = 0;
    for (const type in typeCounts) {
        if (typeCounts[type] > maxCount && type !== 'empty') {
            maxCount = typeCounts[type];
            dominantType = type;
        }
    }
    
    // Basic statistics
    const nonEmptyValues = columnValues.filter(val => val !== null && val !== undefined && val !== '');
    const uniqueValues = [...new Set(nonEmptyValues)].length;
    
    let analysisHTML = `
        <div class="stat-card">
            <h4>Column: ${columnName}</h4>
            <p><strong>Values:</strong> ${columnValues.length}</p>
            <p><strong>Non-Empty:</strong> ${nonEmptyValues.length} (${Math.round((nonEmptyValues.length / columnValues.length) * 100)}%)</p>
            <p><strong>Unique Values:</strong> ${uniqueValues}</p>
            <p><strong>Dominant Type:</strong> ${dominantType}</p>
        </div>
    `;
    
    // Type-specific analysis
    if (dominantType === 'number') {
        const numericValues = columnValues.filter(val => typeof val === 'number');
        if (numericValues.length > 0) {
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);
            const sum = numericValues.reduce((total, val) => total + val, 0);
            const avg = sum / numericValues.length;
            
            // Calculate median
            const sorted = [...numericValues].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
            
            // Standard deviation
            const variance = numericValues.reduce((total, val) => total + Math.pow(val - avg, 2), 0) / numericValues.length;
            const stdDev = Math.sqrt(variance);
            
            analysisHTML += `
                <div class="stat-card">
                    <h4>Numeric Analysis</h4>
                    <p><strong>Minimum:</strong> ${min.toLocaleString()}</p>
                    <p><strong>Maximum:</strong> ${max.toLocaleString()}</p>
                    <p><strong>Range:</strong> ${(max - min).toLocaleString()}</p>
                    <p><strong>Sum:</strong> ${sum.toLocaleString()}</p>
                    <p><strong>Mean:</strong> ${avg.toLocaleString()}</p>
                    <p><strong>Median:</strong> ${median.toLocaleString()}</p>
                    <p><strong>Standard Deviation:</strong> ${stdDev.toFixed(2)}</p>
                </div>
            `;
            
            // Generate a mini histogram
            if (charts.miniHistogram) {
                charts.miniHistogram.destroy();
            }
            
            analysisHTML += `<div class="chart-container"><canvas id="miniHistogram"></canvas></div>`;
        }
    } else if (dominantType === 'string') {
        const stringValues = columnValues.filter(val => typeof val === 'string');
        if (stringValues.length > 0) {
            const lengthSum = stringValues.reduce((total, val) => total + val.length, 0);
            const avgLength = lengthSum / stringValues.length;
            
            // Find most frequent values
            const valueCounts = {};
            stringValues.forEach(val => {
                valueCounts[val] = (valueCounts[val] || 0) + 1;
            });
            
            const sortedValues = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]);
            
            analysisHTML += `
                <div class="stat-card">
                    <h4>Text Analysis</h4>
                    <p><strong>Average Length:</strong> ${avgLength.toFixed(2)} characters</p>
                    <p><strong>Most Common Values:</strong></p>
                    <table>
                        <tr>
                            <th>Value</th>
                            <th>Count</th>
                            <th>Percentage</th>
                        </tr>
            `;
            
            sortedValues.slice(0, 5).forEach(([value, count]) => {
                const percentage = (count / stringValues.length * 100).toFixed(2);
                analysisHTML += `
                    <tr>
                        <td>${value.length > 30 ? value.substring(0, 30) + '...' : value}</td>
                        <td>${count}</td>
                        <td>${percentage}%</td>
                    </tr>
                `;
            });
            
            analysisHTML += `
                    </table>
                </div>
            `;
        }
    }
    
    columnAnalysis.innerHTML = analysisHTML;
    
    // Draw histogram for numeric columns
    if (dominantType === 'number') {
        const numericValues = columnValues.filter(val => typeof val === 'number');
        if (numericValues.length > 0) {
            setTimeout(() => {
                const canvas = document.getElementById('miniHistogram');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    
                    // Create histogram data
                    const min = Math.min(...numericValues);
                    const max = Math.max(...numericValues);
                    const range = max - min;
                    const binCount = Math.min(15, Math.ceil(Math.sqrt(numericValues.length)));
                    const binWidth = range / binCount;
                    
                    const bins = Array(binCount).fill(0);
                    const binLabels = [];
                    
                    for (let i = 0; i < binCount; i++) {
                        const binStart = min + i * binWidth;
                        const binEnd = binStart + binWidth;
                        binLabels.push(`${binStart.toFixed(1)} - ${binEnd.toFixed(1)}`);
                    }
                    
                    numericValues.forEach(val => {
                        if (val === max) {
                            bins[binCount - 1]++;
                        } else {
                            const binIndex = Math.floor((val - min) / binWidth);
                            bins[binIndex]++;
                        }
                    });
                    
                    charts.miniHistogram = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: binLabels,
                            datasets: [{
                                label: 'Frequency',
                                data: bins,
                                backgroundColor: 'rgba(52, 152, 219, 0.5)',
                                borderColor: 'rgba(52, 152, 219, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                title: {
                                    display: true,
                                    text: `Distribution of ${columnName}`
                                },
                                legend: {
                                    display: false
                                }
                            }
                        }
                    });
                }
            }, 50);
        }
    }
}

// Analyze statistics
function analyzeStatistics() {
    const numericalStats = document.getElementById('numericalStats');
    const textStats = document.getElementById('textStats');
    const dataQuality = document.getElementById('dataQuality');
    
    if (csvData.length === 0) {
        numericalStats.innerHTML = '<p>No data available for analysis</p>';
        textStats.innerHTML = '';
        dataQuality.innerHTML = '';
        return;
    }
    
    // Analyze each column
    const columnTypes = [];
    const numericColumns = [];
    const textColumns = [];
    
    headers.forEach(header => {
        const columnValues = csvData.map(row => row[header]);
        
        // Determine column type
        const valueTypes = columnValues.map(value => {
            if (value === null || value === undefined || value === '') return 'empty';
            if (typeof value === 'number') return 'number';
            if (typeof value === 'boolean') return 'boolean';
            if (value instanceof Date) return 'date';
            return 'string';
        });
        
        const typeCounts = {};
        valueTypes.forEach(type => {
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        
        // Determine dominant type
        let dominantType = 'string';
        let maxCount = 0;
        for (const type in typeCounts) {
            if (typeCounts[type] > maxCount && type !== 'empty') {
                maxCount = typeCounts[type];
                dominantType = type;
            }
        }
        
        columnTypes.push(dominantType);
        
        // Add to appropriate category
        if (dominantType === 'number') {
            numericColumns.push({
                header: header,
                values: columnValues.filter(val => typeof val === 'number')
            });
        } else if (dominantType === 'string') {
            textColumns.push({
                header: header,
                values: columnValues.filter(val => typeof val === 'string')
            });
        }
    });
    
    // Numerical statistics
    let numericHTML = '';
    
    if (numericColumns.length > 0) {
        numericHTML += `
            <table>
                <tr>
                    <th>Column</th>
                    <th>Count</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Mean</th>
                    <th>Median</th>
                    <th>Std Dev</th>
                </tr>
        `;
        
        numericColumns.forEach(column => {
            const values = column.values;
            
            if (values.length > 0) {
                const min = Math.min(...values);
                const max = Math.max(...values);
                const sum = values.reduce((total, val) => total + val, 0);
                const avg = sum / values.length;
                
                // Calculate median
                const sorted = [...values].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
                
                // Standard deviation
                const variance = values.reduce((total, val) => total + Math.pow(val - avg, 2), 0) / values.length;
                const stdDev = Math.sqrt(variance);
                
                numericHTML += `
                    <tr>
                        <td>${column.header}</td>
                        <td>${values.length}</td>
                        <td>${min.toLocaleString()}</td>
                        <td>${max.toLocaleString()}</td>
                        <td>${avg.toFixed(2)}</td>
                        <td>${median.toFixed(2)}</td>
                        <td>${stdDev.toFixed(2)}</td>
                    </tr>
                `;
            }
        });
        
        numericHTML += '</table>';
    } else {
        numericHTML = '<p>No numerical columns found for analysis</p>';
    }
    
    numericalStats.innerHTML = numericHTML;
    
    // Text statistics
    let textHTML = '';
    
    if (textColumns.length > 0) {
        textHTML += `
            <table>
                <tr>
                    <th>Column</th>
                    <th>Count</th>
                    <th>Unique Values</th>
                    <th>Avg Length</th>
                    <th>Most Common</th>
                </tr>
        `;
        
        textColumns.forEach(column => {
            const values = column.values;
            
            if (values.length > 0) {
                const uniqueCount = new Set(values).size;
                const lengthSum = values.reduce((total, val) => total + val.length, 0);
                const avgLength = lengthSum / values.length;
                
                // Find most frequent value
                const valueCounts = {};
                values.forEach(val => {
                    valueCounts[val] = (valueCounts[val] || 0) + 1;
                });
                
                const mostCommon = Object.entries(valueCounts).sort((a, b) => b[1] - a[1])[0];
                const mostCommonValue = mostCommon ? mostCommon[0] : 'N/A';
                const mostCommonCount = mostCommon ? mostCommon[1] : 0;
                
                textHTML += `
                    <tr>
                        <td>${column.header}</td>
                        <td>${values.length}</td>
                        <td>${uniqueCount}</td>
                        <td>${avgLength.toFixed(2)}</td>
                        <td>${mostCommonValue.length > 20 ? mostCommonValue.substring(0, 20) + '...' : mostCommonValue} (${mostCommonCount})</td>
                    </tr>
                `;
            }
        });
        
        textHTML += '</table>';
    } else {
        textHTML = '<p>No text columns found for analysis</p>';
    }
    
    textStats.innerHTML = textHTML;
    
    // Data quality analysis
    const totalRows = csvData.length;
    const totalCells = totalRows * headers.length;
    
    // Count missing values per column
    const missingValues = [];
    let totalMissing = 0;
    
    headers.forEach(header => {
        let missing = 0;
        
        csvData.forEach(row => {
            const value = row[header];
            if (value === null || value === undefined || value === '') {
                missing++;
            }
        });
        
        missingValues.push({
            header: header,
            missing: missing,
            percentage: (missing / totalRows) * 100
        });
        
        totalMissing += missing;
    });
    
    // Sort columns by missing percentage
    missingValues.sort((a, b) => b.missing - a.missing);
    
    // Data quality metrics
    const completeness = ((totalCells - totalMissing) / totalCells) * 100;
    
    let dataQualityHTML = `
        <div class="stat-card">
            <h4>Data Completeness</h4>
            <div class="stat-value">${completeness.toFixed(2)}%</div>
            <p>${totalMissing} missing values out of ${totalCells} cells</p>
        </div>
        
        <div class="stat-card">
            <h4>Missing Values by Column</h4>
            <table>
                <tr>
                    <th>Column</th>
                    <th>Missing</th>
                    <th>Percentage</th>
                </tr>
    `;
    
    missingValues.forEach(column => {
        const badgeClass = column.percentage > 50 ? 'badge-danger' : 
                         column.percentage > 20 ? 'badge-warning' : 
                         column.percentage > 5 ? 'badge-primary' : 
                         'badge-success';
        
        dataQualityHTML += `
            <tr>
                <td>${column.header}</td>
                <td>${column.missing}</td>
                <td><span class="badge ${badgeClass}">${column.percentage.toFixed(2)}%</span></td>
            </tr>
        `;
    });
    
    dataQualityHTML += `
            </table>
        </div>
    `;
    
    dataQuality.innerHTML = dataQualityHTML;
    
    // Create data quality chart
    if (charts.dataQualityChart) {
        charts.dataQualityChart.destroy();
    }
    
    const qualityCtx = document.getElementById('dataQualityChart').getContext('2d');
    charts.dataQualityChart = new Chart(qualityCtx, {
        type: 'bar',
        data: {
            labels: missingValues.slice(0, 10).map(col => col.header),
            datasets: [{
                label: 'Missing Values %',
                data: missingValues.slice(0, 10).map(col => col.percentage),
                backgroundColor: '#e74c3c'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Missing Values (%)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Column'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Columns with Highest Missing Value Rates'
                }
            }
        }
    });
}

// Generate visualization
function generateVisualization() {
    const chartType = document.getElementById('chartType').value;
    const xAxis = document.getElementById('xAxisSelector').value;
    const yAxis = document.getElementById('yAxisSelector').value;
    
    if (csvData.length === 0) {
        alert('Not enough data for visualization');
        return;
    }
    
    // Extract data points
    const chartData = csvData.map(row => ({
        x: row[xAxis],
        y: row[yAxis]
    })).filter(point => point.x !== null && point.x !== undefined && 
                       point.y !== null && point.y !== undefined);
    
    // Create the visualization
    if (charts.vizChart) {
        charts.vizChart.destroy();
    }
    
    const vizCtx = document.getElementById('dataVisualizationChart').getContext('2d');
    
    // Configure the chart based on type
    let chartConfig = {
        type: chartType,
        data: {
            labels: chartData.map(point => point.x),
            datasets: [{
                label: yAxis,
                data: chartData.map(point => point.y),
                backgroundColor: 'rgba(52, 152, 219, 0.4)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `${yAxis} by ${xAxis}`
                }
            }
        }
    };
    
    // Specific configurations based on chart type
    if (chartType === 'scatter') {
        chartConfig = {
            type: 'scatter',
            data: {
                datasets: [{
                    label: `${xAxis} vs ${yAxis}`,
                    data: chartData,
                    backgroundColor: 'rgba(52, 152, 219, 0.5)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: xAxis
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: yAxis
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${yAxis} vs ${xAxis} Scatter Plot`
                    }
                }
            }
        };
    } else if (chartType === 'pie') {
        // For pie charts, we need to aggregate the data
        const aggregatedData = {};
        chartData.forEach(point => {
            const key = String(point.x);
            if (!aggregatedData[key]) {
                aggregatedData[key] = 0;
            }
            aggregatedData[key] += point.y;
        });
        
        const labels = Object.keys(aggregatedData);
        const values = Object.values(aggregatedData);
        
        // Generate colors
        const backgroundColors = labels.map((_, i) => 
            `hsl(${(i * 360 / labels.length) % 360}, 70%, 60%)`
        );
        
        chartConfig = {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    title: {
                        display: true,
                        text: `${yAxis} Distribution by ${xAxis}`
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${context.label}: ${value.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };
    }
    
    charts.vizChart = new Chart(vizCtx, chartConfig);
}

// Generate distribution chart
function generateDistributionChart(columnName) {
    if (csvData.length === 0) {
        alert('Not enough data for distribution analysis');
        return;
    }
    
    // Get column values
    const columnValues = csvData.map(row => row[columnName])
                              .filter(val => val !== null && val !== undefined && val !== '');
    
    // Determine column type
    const isNumeric = columnValues.every(val => typeof val === 'number');
    
    if (isNumeric) {
        // For numeric values, create a histogram
        const min = Math.min(...columnValues);
        const max = Math.max(...columnValues);
        const range = max - min;
        const binCount = Math.min(20, Math.ceil(Math.sqrt(columnValues.length)));
        const binWidth = range / binCount;
        
        const bins = Array(binCount).fill(0);
        const binLabels = [];
        
        for (let i = 0; i < binCount; i++) {
            const binStart = min + i * binWidth;
            const binEnd = binStart + binWidth;
            binLabels.push(`${binStart.toFixed(2)} - ${binEnd.toFixed(2)}`);
        }
        
        columnValues.forEach(val => {
            if (val === max) {
                bins[binCount - 1]++;
            } else {
                const binIndex = Math.floor((val - min) / binWidth);
                bins[binIndex]++;
            }
        });
        
        // Create the distribution chart
        if (charts.distributionChart) {
            charts.distributionChart.destroy();
        }
        
        const distCtx = document.getElementById('distributionChart').getContext('2d');
        charts.distributionChart = new Chart(distCtx, {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [{
                    label: 'Frequency',
                    data: bins,
                    backgroundColor: 'rgba(52, 152, 219, 0.5)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Frequency'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: columnName
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                return tooltipItems[0].label;
                            },
                            label: function(context) {
                                return `Count: ${context.raw}`;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: `Distribution of ${columnName}`
                    }
                }
            }
        });
    } else {
        // For non-numeric values, create a bar chart of value frequencies
        const valueCounts = {};
        columnValues.forEach(val => {
            const strVal = String(val);
            valueCounts[strVal] = (valueCounts[strVal] || 0) + 1;
        });
        
        // Sort by frequency
        const sortedEntries = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]);
        
        // Limit to top 20 values
        const topEntries = sortedEntries.slice(0, 20);
        const labels = topEntries.map(entry => entry[0].length > 15 ? entry[0].substring(0, 15) + '...' : entry[0]);
        const counts = topEntries.map(entry => entry[1]);
        
        // Create the distribution chart
        if (charts.distributionChart) {
            charts.distributionChart.destroy();
        }
        
        const distCtx = document.getElementById('distributionChart').getContext('2d');
        charts.distributionChart = new Chart(distCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frequency',
                    data: counts,
                    backgroundColor: 'rgba(46, 204, 113, 0.5)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Frequency'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: columnName
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: `Distribution of ${columnName} (Top ${topEntries.length} Values)`
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = columnValues.length;
                                const percentage = Math.round((value / total) * 100);
                                return `Count: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// Generate text report
function generateTextReport() {
    if (csvData.length === 0) {
        alert('Please upload a CSV file first');
        return;
    }
    
    const textReportElement = document.getElementById('textReport');
    let reportText = '';
    
    // File overview
    reportText += '=============================================================\n';
    reportText += '                   CSV FILE ANALYSIS REPORT                  \n';
    reportText += '=============================================================\n\n';
    
    reportText += 'GENERAL INFORMATION\n';
    reportText += '-------------------\n';
    reportText += `File Name: ${document.getElementById('fileName').textContent}\n`;
    reportText += `Number of Columns: ${headers.length}\n`;
    reportText += `Number of Rows: ${csvData.length}\n`;
    reportText += `Column Headers: ${headers.join(', ')}\n\n`;
    
    // Overall Statistics
    const totalCells = csvData.length * headers.length;
    let nonEmptyCells = 0;
    let numericCells = 0;
    let textCells = 0;
    
    csvData.forEach(row => {
        headers.forEach(header => {
            const value = row[header];
            if (value !== null && value !== undefined && value !== '') {
                nonEmptyCells++;
                
                if (typeof value === 'number') {
                    numericCells++;
                } else if (typeof value === 'string') {
                    textCells++;
                }
            }
        });
    });
    
    reportText += 'OVERALL STATISTICS\n';
    reportText += '------------------\n';
    reportText += `Total Rows: ${csvData.length.toLocaleString()}\n`;
    reportText += `Total Columns: ${headers.length}\n`;
    reportText += `Total Cells: ${totalCells.toLocaleString()}\n`;
    reportText += `Data Density: ${Math.round((nonEmptyCells / totalCells) * 100)}% (${nonEmptyCells.toLocaleString()} non-empty cells)\n`;
    reportText += `Numeric Values: ${numericCells.toLocaleString()} (${Math.round((numericCells / nonEmptyCells) * 100)}% of non-empty cells)\n`;
    reportText += `Text Values: ${textCells.toLocaleString()} (${Math.round((textCells / nonEmptyCells) * 100)}% of non-empty cells)\n\n`;
    
    // Column Details
    reportText += '=============================================================\n';
    reportText += '                   COLUMN-BY-COLUMN ANALYSIS                 \n';
    reportText += '=============================================================\n\n';
    
    headers.forEach((header, index) => {
        // Get column values
        const columnValues = csvData.map(row => row[header]);
        
        // Determine column type
        const valueTypes = columnValues.map(value => {
            if (value === null || value === undefined || value === '') return 'empty';
            if (typeof value === 'number') return 'number';
            if (typeof value === 'boolean') return 'boolean';
            if (value instanceof Date) return 'date';
            return 'string';
        });
        
        const typeCounts = {};
        valueTypes.forEach(type => {
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        
        // Determine dominant type
        let dominantType = 'string';
        let maxCount = 0;
        for (const type in typeCounts) {
            if (typeCounts[type] > maxCount && type !== 'empty') {
                maxCount = typeCounts[type];
                dominantType = type;
            }
        }
        
        // Basic statistics
        const nonEmptyValues = columnValues.filter(val => val !== null && val !== undefined && val !== '');
        const uniqueValues = [...new Set(nonEmptyValues)].length;
        
        reportText += `COLUMN ${index + 1}: ${header}\n`;
        reportText += ''.padEnd(header.length + 10, '-') + '\n';
        reportText += `Data Type: ${dominantType}\n`;
        reportText += `Values: ${columnValues.length}\n`;
        reportText += `Non-Empty: ${nonEmptyValues.length} (${Math.round((nonEmptyValues.length / columnValues.length) * 100)}%)\n`;
        reportText += `Unique Values: ${uniqueValues}\n`;
        
        // Type-specific analysis
        if (dominantType === 'number') {
            const numericValues = columnValues.filter(val => typeof val === 'number');
            if (numericValues.length > 0) {
                const min = Math.min(...numericValues);
                const max = Math.max(...numericValues);
                const sum = numericValues.reduce((total, val) => total + val, 0);
                const avg = sum / numericValues.length;
                
                // Calculate median
                const sorted = [...numericValues].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
                
                // Standard deviation
                const variance = numericValues.reduce((total, val) => total + Math.pow(val - avg, 2), 0) / numericValues.length;
                const stdDev = Math.sqrt(variance);
                
                reportText += `Minimum: ${min.toLocaleString()}\n`;
                reportText += `Maximum: ${max.toLocaleString()}\n`;
                reportText += `Range: ${(max - min).toLocaleString()}\n`;
                reportText += `Sum: ${sum.toLocaleString()}\n`;
                reportText += `Mean: ${avg.toLocaleString()}\n`;
                reportText += `Median: ${median.toLocaleString()}\n`;
                reportText += `Standard Deviation: ${stdDev.toFixed(2)}\n`;
            }
        } else if (dominantType === 'string') {
            const stringValues = columnValues.filter(val => typeof val === 'string');
            if (stringValues.length > 0) {
                const lengthSum = stringValues.reduce((total, val) => total + val.length, 0);
                const avgLength = lengthSum / stringValues.length;
                
                // Find most frequent values
                const valueCounts = {};
                stringValues.forEach(val => {
                    valueCounts[val] = (valueCounts[val] || 0) + 1;
                });
                
                const sortedValues = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]);
                
                reportText += `Average Length: ${avgLength.toFixed(2)} characters\n`;
                
                if (sortedValues.length > 0) {
                    reportText += `Most Common Values (top 3):\n`;
                    sortedValues.slice(0, 3).forEach(([value, count]) => {
                        const displayValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
                        const percentage = (count / stringValues.length * 100).toFixed(2);
                        reportText += `  "${displayValue}": ${count} occurrences (${percentage}%)\n`;
                    });
                }
            }
        }
        
        reportText += '\n';
    });
    
    // Data quality
    reportText += 'DATA QUALITY ANALYSIS\n';
    reportText += '---------------------\n';
    
    // Count missing values per column
    const missingValues = [];
    let totalMissing = 0;
    
    headers.forEach(header => {
        let missing = 0;
        
        csvData.forEach(row => {
            const value = row[header];
            if (value === null || value === undefined || value === '') {
                missing++;
            }
        });
        
        missingValues.push({
            header: header,
            missing: missing,
            percentage: (missing / csvData.length) * 100
        });
        
        totalMissing += missing;
    });
    
    // Sort columns by missing percentage
    missingValues.sort((a, b) => b.missing - a.missing);
    
    // Data quality metrics
    const completeness = ((totalCells - totalMissing) / totalCells) * 100;
    
    reportText += `Overall Data Completeness: ${completeness.toFixed(2)}%\n`;
    reportText += `Total Missing Values: ${totalMissing.toLocaleString()} out of ${totalCells.toLocaleString()} cells\n\n`;
    reportText += 'Missing Values by Column:\n';
    
    missingValues.forEach(column => {
        reportText += `  ${column.header}: ${column.missing.toLocaleString()} (${column.percentage.toFixed(2)}%)\n`;
    });
    
    reportText += '\n';
    
    // Recommendations
    reportText += 'RECOMMENDATIONS\n';
    reportText += '---------------\n';
    
    // Columns with high missing rates
    const highMissingColumns = missingValues.filter(col => col.percentage > 20);
    if (highMissingColumns.length > 0) {
        reportText += 'Columns with high missing value rates (>20%):\n';
        highMissingColumns.forEach(column => {
            reportText += `  ${column.header}: ${column.percentage.toFixed(2)}% missing\n`;
        });
        reportText += '  Consider addressing missing values or excluding these columns from analysis.\n\n';
    } else {
        reportText += 'No columns have a high rate of missing values (>20%).\n\n';
    }
    
    // Check for potential ID columns
    const potentialIdColumns = [];
    headers.forEach(header => {
        const values = csvData.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
        const uniqueCount = new Set(values).size;
        const uniquePercentage = (uniqueCount / values.length) * 100;
        
        if (uniquePercentage > 95 && values.length > 0) {
            potentialIdColumns.push({
                header: header,
                uniquePercentage: uniquePercentage
            });
        }
    });
    
    if (potentialIdColumns.length > 0) {
        reportText += 'Potential ID/Key columns (>95% unique values):\n';
        potentialIdColumns.forEach(column => {
            reportText += `  ${column.header}: ${column.uniquePercentage.toFixed(2)}% unique\n`;
        });
        reportText += '\n';
    }
    
    reportText += 'Potential Next Steps:\n';
    reportText += '  1. Data Cleaning: Address missing values through imputation or removal.\n';
    reportText += '  2. Data Transformation: Consider normalizing or standardizing numeric columns.\n';
    reportText += '  3. Feature Engineering: Create new columns based on existing data to enhance analysis.\n';
    reportText += '  4. Exploratory Analysis: Investigate relationships between columns for insights.\n\n';
    
    reportText += '=============================================================\n';
    reportText += '                     END OF REPORT                           \n';
    reportText += '=============================================================\n';
    reportText += '\nReport generated on: ' + new Date().toLocaleString() + '\n';
    
    textReportElement.textContent = reportText;
}

// Copy text report to clipboard
function copyTextReport() {
    const textReportElement = document.getElementById('textReport');
    
    if (textReportElement.textContent.trim() === 'Click "Generate Report" to create a comprehensive summary of the CSV file.') {
        alert('Please generate the report first');
        return;
    }
    
    // Create a temporary textarea element
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = textReportElement.textContent;
    document.body.appendChild(tempTextArea);
    
    // Select and copy the text
    tempTextArea.select();
    document.execCommand('copy');
    
    // Remove the temporary element
    document.body.removeChild(tempTextArea);
    
    alert('Report copied to clipboard');
}

// Download text report
function downloadTextReport() {
    const textReportElement = document.getElementById('textReport');
    
    if (textReportElement.textContent.trim() === 'Click "Generate Report" to create a comprehensive summary of the CSV file.') {
        alert('Please generate the report first');
        return;
    }
    
    const reportText = textReportElement.textContent;
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'csv-analysis-report.txt';
    a.click();
    URL.revokeObjectURL(url);
}

// Export processed CSV
function exportProcessedCSV() {
    if (csvData.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Convert JSON back to CSV
    const csv = Papa.unparse(csvData);
    
    // Create and trigger download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processed-data.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// Export as JSON
function exportAsJSON() {
    if (csvData.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Create and trigger download
    const blob = new Blob([JSON.stringify(csvData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exported-data.json';
    a.click();
    URL.revokeObjectURL(url);
}