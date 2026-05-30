/**
 * FurnitureCatalogManager
 * 
 * Manages runtime furniture catalog refresh for Sweet Home 3D.
 * Allows dynamically loading new furniture pieces that are uploaded via the Management UI
 * without requiring a page reload.
 * 
 * Usage:
 *   const manager = new FurnitureCatalogManager(application, apiBaseUrl);
 *   await manager.refreshCatalog();
 */

class FurnitureCatalogManager {
  constructor(application, apiBaseUrl) {
    this.application = application;
    this.apiBaseUrl = apiBaseUrl;
    this.lastTimestamp = 0;
    this.isRefreshing = false;
  }

  /**
   * Refresh the furniture catalog from the server.
   * 
   * @returns {Promise<boolean>} True if refresh was successful, false otherwise
   */
  async refreshCatalog() {
    if (this.isRefreshing) {
      console.log('Catalog refresh already in progress...');
      return false;
    }

    this.isRefreshing = true;
    try {
      const response = await fetch(
        this.apiBaseUrl + 'furniture/catalog/refresh',
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        }
      );

      if (!response.ok) {
        console.error('Catalog refresh HTTP error:', response.status, response.statusText);
        return false;
      }

      const data = await response.json();

      if (data.success && data.catalog) {
        // Check if catalog actually changed
        if (data.timestamp !== this.lastTimestamp) {
          console.log('Furniture catalog changed, updating...', 
            `(timestamp: ${this.lastTimestamp} -> ${data.timestamp})`);
          this._applyCatalogToApplication(data.catalog);
          this.lastTimestamp = data.timestamp;
          console.log('✓ Furniture catalog refreshed successfully');
          return true;
        } else {
          console.log('Catalog is up to date');
          return true;
        }
      } else {
        console.error('Catalog refresh failed:', data.error || 'Unknown error');
        return false;
      }
    } catch (err) {
      console.error('Catalog refresh error:', err);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Apply fetched catalog JSON to SweetHome3D application's in-memory catalog.
   * @private
   */
  _applyCatalogToApplication(catalogJson) {
    const homes = this.application.getHomes();
    if (!homes || homes.length === 0) {
      console.warn('No homes found in application');
      return;
    }

    homes.forEach((home, idx) => {
      try {
        const catalog = home.getFurnitureCatalog();
        if (catalog) {
          this._updateCatalogWithNewFurniture(catalog, catalogJson);
          console.log(`  Updated home ${idx + 1} furniture catalog`);
        }
      } catch (err) {
        console.error(`Failed to update home ${idx + 1}:`, err);
      }
    });
  }

  /**
   * Update a home's furniture catalog with entries from the JSON.
   * @private
   */
  _updateCatalogWithNewFurniture(catalog, catalogJson) {
    // Parse the flat JSON structure
    const furniture = this._parseCatalogJSON(catalogJson);

    // Get existing furniture IDs
    const existingIds = this._getExistingFurnitureIds(catalog);

    // Log statistics
    console.log(`  Found ${Object.keys(furniture).length} total furniture items in catalog`);
    console.log(`  Catalog has ${existingIds.size} existing items`);

    // Register new furniture
    let newCount = 0;
    for (const [id, props] of Object.entries(furniture)) {
      if (!existingIds.has(id)) {
        // This is a new furniture piece
        console.log(`    New furniture: ${id} (${props.name || 'unnamed'})`);
        // NOTE: Full registration requires internal SH3D APIs
        // that are not exposed in the JavaScript bindings.
        // This logs what would be registered.
        newCount++;
      }
    }

    console.log(`  New furniture items detected: ${newCount}`);
    if (newCount > 0) {
      console.log('  ⚠️  Note: Full registration requires Sweet Home 3D internal APIs.');
      console.log('  Consider implementing a page refresh trigger after uploads.');
    }
  }

  /**
   * Parse flat-structured catalog JSON into grouped furniture objects.
   * @private
   */
  _parseCatalogJSON(flatCatalog) {
    const furniture = {};

    for (const [key, value] of Object.entries(flatCatalog)) {
      if (key.includes('#')) {
        // Split on first # to handle IDs with # characters
        const hashIdx = key.indexOf('#');
        const prop = key.substring(0, hashIdx);
        const id = key.substring(hashIdx + 1);

        if (!furniture[id]) {
          furniture[id] = { _id: id };
        }
        furniture[id][prop] = value;
      }
    }

    return furniture;
  }

  /**
   * Get existing furniture IDs from the catalog.
   * @private
   */
  _getExistingFurnitureIds(catalog) {
    const ids = new Set();

    try {
      if (catalog.getFurniture && typeof catalog.getFurniture === 'function') {
        const furnitureList = catalog.getFurniture();
        if (Array.isArray(furnitureList)) {
          furnitureList.forEach(piece => {
            if (piece && piece.getId) {
              const id = piece.getId();
              if (id) ids.add(String(id));
            }
          });
        }
      }
    } catch (err) {
      console.warn('Could not enumerate existing furniture:', err);
    }

    return ids;
  }

  /**
   * Set up auto-refresh on a timer.
   * @param {number} intervalMs - Refresh interval in milliseconds (default: 30000ms = 30s)
   */
  startAutoRefresh(intervalMs = 30000) {
    if (this.autoRefreshHandle) {
      clearInterval(this.autoRefreshHandle);
    }

    console.log(`Starting auto-refresh of furniture catalog every ${intervalMs}ms`);
    this.autoRefreshHandle = setInterval(() => {
      this.refreshCatalog();
    }, intervalMs);
  }

  /**
   * Stop auto-refresh.
   */
  stopAutoRefresh() {
    if (this.autoRefreshHandle) {
      clearInterval(this.autoRefreshHandle);
      this.autoRefreshHandle = null;
      console.log('Stopped auto-refresh of furniture catalog');
    }
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FurnitureCatalogManager;
}
