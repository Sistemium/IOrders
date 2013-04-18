Ext.override(Ext.form.FormPanel, {
	
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
						values[imported.name] = imported.value;
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