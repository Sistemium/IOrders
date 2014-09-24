Ext.override(Ext.form.Select, {

	initComponent: function() {
		
		if (!this.clsColumn) {
			var table = Ext.getStore('tables').getById(this.store.model.prototype.modelName);
			
			if (table)
				this.clsColumn = table.get('clsColumn')
			;
			
		}
		
		this.mon(this.store,'load', function () {
			
			var value = this.value,
				idx = -1,
				record
			;
			
			if (value) {
				idx = this.store.findExact(this.valueField, value)
			}
			
			record = this.store.getAt(idx);
			
			if (record && this.rendered) {
				this.fieldEl.dom.value = record.get(this.displayField);
			}
			
		}, this);
		
	},
	
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
				if (listPanel.items.getAt(0).getHeight() > listPanel.getHeight())
					listPanel.doComponentLayout()
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
			this.listPanel.doHide();
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
	
	onPickerChange: function(picker, value) {
		
        var currentValue = this.getValue(),
            newValue = value[this.name]
		;
        
		if (newValue != currentValue) {
            this.setValue(newValue);
            this.fireEvent('change', this, newValue);
        }
		
        Ext.dispatch({
        	action: 'onSelectFieldValueChange',
        	field: this,
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
		
		var otherFields = this.ownerCt.items;
		
		record && Ext.each(this.importFields, function(extraField) {
			extraField.value = record.get(extraField.name);
			var f = otherFields.getByKey(extraField.toName);
			f && f.setValue (extraField.value);
		});
        
        return this;
    },
	
	getListPanel: function() {
		
        if (!this.listPanel) {
            this.listPanel = new Ext.Panel({
                floating         : true,
                stopMaskTapEvent : false,
                hideOnMaskTap    : true,
                cls              : 'x-select-overlay',
                scroll           : 'vertical',
                items: {
                    xtype: 'list',
                    store: this.store,
					grouped: this.store.groupField ? true :false,
                    itemId: 'list',
                    scroll: false,
                    itemTpl : [
                        '{' + this.displayField + '}',
                        ''
                    ],
                    listeners: {
                        select : this.onListSelect,
                        scope  : this
                    }
                }
            });
        }
		
        return this.listPanel;
    },
	
})