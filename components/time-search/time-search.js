// Time Search Component
class TimeSearch {
    constructor() {
        this.startDate = null;
        this.endDate = null;
        this.dateRangePicker = null;
    }

    init() {
        this.initializeDateRangePicker();
        this.setupEventListeners();
    }

    initializeDateRangePicker() {
        const $dateRange = $('#date-range');
        
        $dateRange.daterangepicker({
            autoUpdateInput: false,
            locale: {
                cancelLabel: 'Clear'
            },
            ranges: {
                'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                'Last 90 Days': [moment().subtract(89, 'days'), moment()]
            }
        });

        $dateRange.on('apply.daterangepicker', (ev, picker) => {
            this.startDate = picker.startDate.toDate();
            this.endDate = picker.endDate.toDate();
            $dateRange.val(picker.startDate.format('MM/DD/YYYY') + ' - ' + picker.endDate.format('MM/DD/YYYY'));
            this.updateTimeRange();
        });

        $dateRange.on('cancel.daterangepicker', () => {
            $dateRange.val('');
            this.startDate = null;
            this.endDate = null;
            this.updateTimeRange();
        });
    }

    setupEventListeners() {
        // Handle preset buttons
        document.querySelectorAll('.date-preset-button').forEach(button => {
            button.addEventListener('click', () => {
                const days = parseInt(button.dataset.days);
                const endDate = moment();
                const startDate = moment().subtract(days - 1, 'days');
                
                $('#date-range').data('daterangepicker').setStartDate(startDate);
                $('#date-range').data('daterangepicker').setEndDate(endDate);
                
                this.startDate = startDate.toDate();
                this.endDate = endDate.toDate();
                $('#date-range').val(startDate.format('MM/DD/YYYY') + ' - ' + endDate.format('MM/DD/YYYY'));
                this.updateTimeRange();
            });
        });
    }

    updateTimeRange() {
        // Emit event for other components
        const event = new CustomEvent('timeRangeUpdated', {
            detail: {
                startDate: this.startDate,
                endDate: this.endDate
            }
        });
        document.dispatchEvent(event);
    }

    getTimeRange() {
        return {
            startDate: this.startDate,
            endDate: this.endDate
        };
    }

    clearTimeRange() {
        this.startDate = null;
        this.endDate = null;
        $('#date-range').val('');
    }
}

export default TimeSearch; 