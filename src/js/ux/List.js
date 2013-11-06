Ext.override(Ext.List, {

	onIndex : function(record, target, index) {
        var key = record.get('key').toLowerCase(),
            groups = this.store.getGroups(),
            ln = groups.length,
            group, i, closest, id;

        groups.sort(function(a, b) {
        	var o1 = a.name.toLowerCase(),
        		o2 = b.name.toLowerCase()
        	;
        	return o1 == o2 ? 0 : (o1 > o2 ? 1: -1);
        });
        for (i = 0; i < ln; i++) {
            group = groups[i];
            id = this.getGroupId(group);

            if (id == key || id > key) {
                closest = id;
                break;
            }
            else {
                closest = id;
            }
        }

        closest = this.getTargetEl().down('.x-group-' + id.replace('.', '\\.'));
        if (closest) {
            this.scroller.scrollTo({x: 0, y: closest.getOffsetsTo(this.scrollEl)[1]}, 400);
        }
        return closest;
    },

	listeners: {
		/*selectionchange: function(selModel, selections) {
			Ext.dispatch({action: 'onListSelectionChange', list: this, selModel: selModel, selections: selections});
		},*/
		itemtap: function(list, idx, item, e) {
			Ext.dispatch({action: 'onListItemTap', list: list, idx: idx, item: item, event: e});
		},
		disclose: function(rec, item, idx, e) {
			Ext.dispatch({action: 'onListItemDisclosure', list: this, idx: idx, item: item, event: e});
		},
		update: function() {

			this.scroller && this.scroller.updateBoundary();
		}
	},

	onUpdate : function(store, record) {

		this.itemRefresh = true;
		Ext.List.superclass.onUpdate.apply(this, arguments);
		this.itemRefresh = false;
	},

	bufferRender : function(records, index){
		var div = document.createElement('div');

		if (this.grouped && this.itemRefresh && records.length == 1) {
			this.listItemTpl.overwrite (div, Ext.List.superclass.collectData.call(this, records, index));
		} else {
			this.tpl.overwrite(div, this.collectData(records, index));
		}

		return Ext.query(this.itemSelector, div);
	},
	
	unGroup: function () {
		
		if (!this.grouped) return this;
		
		this.groupedTpl = this.tpl;
		
		this.grouped = false;
		this.tpl = this.listItemTpl;
		
		return this;
	},

	reGroup: function () {
		
		if (!this.groupedTpl) return false;
		if (this.grouped) return this;
		
		this.grouped = true;
		this.tpl = this.groupedTpl;
		
		return this;
	}
})