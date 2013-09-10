Ext.override(Ext.form.Select, {

    showComponent: function() {
        if (Ext.is.Phone) {
            var picker = this.getPicker(),
                name   = this.name,
                value  = {};
                
            value[name] = this.getValue();
            picker.show();
            picker.setValue(value);
        }
        else {
            var listPanel = this.getListPanel(),
                index = this.store.findExact(this.valueField, this.value);
			
			if (this.store.getCount() > 0) {
				listPanel.showBy(this.el, 'fade', false);
				var selectionModel = listPanel.down('#list').getSelectionModel();
				
				if (index >= 0)
					selectionModel.select(index, false, true);
				else
					selectionModel.deselectAll()
				;
			}
        }
    },
	
	onListSelect: function(selModel, selected) {
		
		if (this.listPanel.hidden) {
			IOrders.logEvent({
				module:'SelectField.js',
				action: 'onListSelect' ,
				data: 'this.listPanel.hidden',
				force: true
			});
			return;
		}
		
        this.listPanel.hide({
            type: 'fade',
            out: true,
            scope: this
        });
        
        if (selected) {
            this.setValue(selected.get(this.valueField));
            this.fireEvent('change', this, this.getValue());
        }
        
        Ext.dispatch({
        	action: 'onSelectFieldValueChange',
        	field: this,
        	selected: selected,
        	filter: true
        });
    },

	onRender: function(){
        Ext.form.Select.superclass.onRender.apply(this, arguments);
        
        var name = this.hiddenName;
        if (name) {
            this.hiddenField = this.el.insertSibling({
                name: name,
                tag: 'input',
                type: 'hidden'
            }, 'after');
        }
        
        this.onFieldLabelTap && this.mon(this.labelEl,'tap', function(evt, el, o) {
        	Ext.dispatch({
        		action: 'onFieldLabelTap',
        		field: this
        	});
        }, this);
    },

    onMaskTap: function() {
        if (this.onFieldInputTap && this.disabled) {
        	Ext.dispatch({
        		action: 'onFieldInputTap',
        		field: this
        	});
            return;
        }
        
        this.showComponent();
    },

	setItemTplWithTitle: function() {
		
		var list = this.listPanel.getComponent('list'),
			table = Ext.getStore('tables').getById(this.store.model.prototype.modelName),
			titleColumns = table.getTitleColumns(),
			clsColumn = this.clsColumn
		;
		
		list.itemTpl = ['<div class="x-list-label'
			+ (clsColumn ? ' {'+clsColumn+'}' : '')
			+ '">{' + this.displayField + '}</div>'];
		titleColumns.each(function(col) {list.itemTpl.push('<div>{' + col.get('name') + '}</div>');});
		list.itemTpl.push('<span class="x-list-selected"></span>');
		
		list.tpl = '<tpl for="."><div class="x-list-item ' + list.itemCls + '"><div class="x-list-item-body">' + list.itemTpl.join('') + '</div>';
		list.tpl += '</div></tpl>';
		list.tpl = new Ext.XTemplate(list.tpl);
	},
	
    setValue: function(value) {
        var idx = -1,
            hiddenField = this.hiddenField,
            record
		;

        if (value) {
            idx = this.store.findExact(this.valueField, value)
        } 
        record = this.store.getAt(idx);

        if (record && this.rendered) {
            this.fieldEl.dom.value = record.get(this.displayField);
            this.value = record.get(this.valueField);
            if (hiddenField) {
                hiddenField.dom.value = this.value;
            }
        } else {
            if (this.rendered) {
                this.fieldEl.dom.value = value;
            }
            this.value = value;
        }

        
        if (this.picker) {
            var pickerValue = {};
            pickerValue[this.name] = this.value;
            this.picker.setValue(pickerValue);
        }
		
		if (this.rendered) {
			if (this.oldColumnCls)
				this.fieldEl.removeCls(this.oldColumnCls)
			;
			if (record && this.clsColumn){
				this.oldColumnCls = record.get(this.clsColumn);
				this.oldColumnCls && this.fieldEl.addCls(this.oldColumnCls)
			}
		}
		
		record && Ext.each(this.importFields, function(extraField) {
			extraField.value = record.get(extraField.name);
		});
        
        return this;
    }
	
})