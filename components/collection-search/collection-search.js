// Collection Search Component
class CollectionSearch {
    constructor() {
        this.selectedCollection = null;
        this.collections = [];
        this.isLoading = false;
    }

    async init() {
        this.showLoading();
        await this.loadCollections();
        this.setupEventListeners();
    }

    showLoading() {
        const select = document.getElementById('collection-select');
        select.innerHTML = '<option value="">Loading collections...</option>';
        select.disabled = true;
        this.isLoading = true;
    }

    showError(message) {
        const select = document.getElementById('collection-select');
        select.innerHTML = '<option value="">Error loading collections</option>';
        select.disabled = true;
        
        const info = document.getElementById('collection-info');
        info.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
    }

    async loadCollections() {
        try {
            const response = await fetch('/api/collections');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.collections = await response.json();
            this.populateCollectionDropdown();
        } catch (error) {
            console.error('Error loading collections:', error);
            this.showError('Failed to load collections. Please try again later.');
        } finally {
            this.isLoading = false;
        }
    }

    populateCollectionDropdown() {
        const select = document.getElementById('collection-select');
        select.innerHTML = '<option value="">Select a collection</option>';
        select.disabled = false;

        // Group collections by provider
        const groupedCollections = this.groupCollectionsByProvider();
        
        for (const [provider, collections] of Object.entries(groupedCollections)) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = provider;
            
            collections.forEach(collection => {
                const option = document.createElement('option');
                option.value = collection.id;
                option.textContent = collection.title;
                optgroup.appendChild(option);
            });
            
            select.appendChild(optgroup);
        }
    }

    groupCollectionsByProvider() {
        return this.collections.reduce((groups, collection) => {
            const provider = collection.provider || 'Other';
            if (!groups[provider]) {
                groups[provider] = [];
            }
            groups[provider].push(collection);
            return groups;
        }, {});
    }

    setupEventListeners() {
        document.getElementById('collection-select').addEventListener('change', (e) => {
            this.selectedCollection = e.target.value;
            this.updateCollectionSelection();
            this.updateCollectionInfo();
        });
    }

    updateCollectionSelection() {
        // Emit event for other components
        const event = new CustomEvent('collectionUpdated', {
            detail: { collection: this.selectedCollection }
        });
        document.dispatchEvent(event);
    }

    updateCollectionInfo() {
        const info = document.getElementById('collection-info');
        if (!this.selectedCollection) {
            info.innerHTML = '';
            return;
        }

        const collection = this.collections.find(c => c.id === this.selectedCollection);
        if (collection) {
            info.innerHTML = `
                <h4>${collection.title}</h4>
                <p>${collection.description}</p>
            `;
        }
    }

    getSelectedCollection() {
        return this.selectedCollection;
    }

    clearSelection() {
        this.selectedCollection = null;
        document.getElementById('collection-select').value = '';
        document.getElementById('collection-info').innerHTML = '';
    }
}

export default CollectionSearch; 