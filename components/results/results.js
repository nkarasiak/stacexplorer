// Results Component
class Results {
    constructor() {
        this.results = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('searchAreaUpdated', this.handleSearchAreaUpdate.bind(this));
        document.addEventListener('timeRangeUpdated', this.handleTimeRangeUpdate.bind(this));
        document.addEventListener('collectionUpdated', this.handleCollectionUpdate.bind(this));
    }

    async handleSearchAreaUpdate(event) {
        await this.performSearch();
    }

    async handleTimeRangeUpdate(event) {
        await this.performSearch();
    }

    async handleCollectionUpdate(event) {
        await this.performSearch();
    }

    async performSearch() {
        const searchParams = this.getSearchParameters();
        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(searchParams)
            });
            
            this.results = await response.json();
            this.renderResults();
        } catch (error) {
            console.error('Error performing search:', error);
            this.showError('Failed to perform search. Please try again.');
        }
    }

    getSearchParameters() {
        return {
            collection: document.dispatchEvent(new CustomEvent('getSelectedCollection')),
            timeRange: document.dispatchEvent(new CustomEvent('getTimeRange')),
            searchArea: document.dispatchEvent(new CustomEvent('getSearchArea')),
            page: this.currentPage,
            itemsPerPage: this.itemsPerPage
        };
    }

    renderResults() {
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.innerHTML = '';

        if (this.results.length === 0) {
            this.showNoResults();
            return;
        }

        this.results.forEach(result => {
            const resultCard = this.createResultCard(result);
            resultsContainer.appendChild(resultCard);
        });

        this.renderPagination();
    }

    createResultCard(result) {
        const card = document.createElement('div');
        card.className = 'result-card';
        
        // Add thumbnail if available
        if (result.thumbnail) {
            const thumbnail = document.createElement('img');
            thumbnail.src = result.thumbnail;
            thumbnail.alt = result.title;
            card.appendChild(thumbnail);
        }

        // Add result details
        const details = document.createElement('div');
        details.className = 'result-details';
        details.innerHTML = `
            <h3>${result.title}</h3>
            <p>${result.description}</p>
            <div class="result-metadata">
                <span>Date: ${result.date}</span>
                <span>Provider: ${result.provider}</span>
            </div>
        `;
        card.appendChild(details);

        return card;
    }

    renderPagination() {
        const totalPages = Math.ceil(this.results.length / this.itemsPerPage);
        const pagination = document.createElement('div');
        pagination.className = 'pagination';

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = i === this.currentPage ? 'active' : '';
            pageButton.addEventListener('click', () => this.changePage(i));
            pagination.appendChild(pageButton);
        }

        document.getElementById('pagination-container').innerHTML = '';
        document.getElementById('pagination-container').appendChild(pagination);
    }

    changePage(page) {
        this.currentPage = page;
        this.performSearch();
    }

    showNoResults() {
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No results found for your search criteria.</p>
            </div>
        `;
    }

    showError(message) {
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

export default Results; 