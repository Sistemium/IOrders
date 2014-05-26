Ext.override(Ext.data.Store, {
	
	autoDestroy: true,
	
	destroy: function() {
		this.destroyStore();
	},
	
	filter: function(filters, value) {
		
        if (Ext.isString(filters)) {
            filters = {
                property: filters,
                value   : value
            };
        }
        
        this.filters.addAll(this.decodeFilters(filters));
		
        if (this.remoteFilter) {
            //the load function will pick up the new filters and request the filtered data from the proxy
            this.load(filters.callback);
        } else {
            
            this.snapshot = this.snapshot || this.data.clone();
            this.data = this.data.filter(this.filters.items);
            
            if (this.sortOnFilter && !this.remoteSort) {
                this.sort();
            } else {
                this.fireEvent('datachanged', this);
            }
			
			if (filters && filters.callback && (typeof filters.callback) == 'function')
				filters.callback ()
			;
        }
    },
	
});