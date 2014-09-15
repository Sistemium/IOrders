Ext.override(Ext.form.FormPanel, {
	
    loadRecord: function(instance) {
        if (instance && instance.data) {
			
			var fields = this.getFields();
            
			this.setValues(instance.data);
            
            this.record = instance;
			
			fields && Ext.iterate(fields, function(fname, f) {
				if (f.xtype=='templatefield')
					f.setData (instance.data)
			});
        }
		
		this.record.get('serverPhantom') || this.fireEvent ('update', this.record);
        
        return this;
    },

    getValues: function(enabled) {
        var fields = this.getFields(),
            field,
            values = {},
            name;
		
        for (name in fields) {
            if (fields.hasOwnProperty(name)) {
                if (Ext.isArray(fields[name])) {
                    values[name] = [];
					
                    fields[name].forEach(function(field) {
                        if (field.isChecked() && !(enabled && field.disabled)) {
                            if (field instanceof Ext.form.Radio) {
                                values[name] = field.getValue();
                            } else {
                                values[name].push(field.getValue());
                            }
                        }
                    });
                } else {
                    field = fields[name];
                    
                    if (!(enabled && field.disabled)) {
                        if (field instanceof Ext.form.Checkbox) {
                            values[name] = (field.isChecked()) ? field.getValue() : null;
                        } else {
                            values[name] = field.getValue();
                        }
                    }
					
					Ext.each(field.importFields, function(imported) {
						values[imported.toName || imported.name] = imported.value;
					})
                }
            }
        }
        return values;
    },
	
	getElConfig: function() {
		return Ext.apply(Ext.form.FormPanel.superclass.getElConfig.call(this), {
			tag: 'div'
		});
	},
    
	listeners: {
		beforesubmit: function(form, values, options) {
			
			if(form.ownSubmit) {
				Ext.dispatch({
					action: 'onBeforeSubmitForm',
					form: form,
					values: values,
					opt: options
				});
				return false;
			}
			return true;
		}
	}
    
});