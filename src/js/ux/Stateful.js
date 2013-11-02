Ext.override (Ext.util.Stateful, {
	get: function(field) {
		if ( typeof this[field] == 'function')
			return this[field]();
		else
			return this[this.persistanceProperty][field];
	}
});


if(Ext.version === '1.1.1') {
	Ext.override(Ext.util.Stateful, {
		set: function(fieldName, value) {
			var me = this,
				fields = me.fields,
				modified = me.modified,
				convertFields = [],
				currentValue = me[me.persistanceProperty][fieldName],
				field, key, i;
			
			
			if (arguments.length == 1 && Ext.isObject(fieldName)) {
				for (key in fieldName) {
					if (!fieldName.hasOwnProperty(key)) {
						continue;
					}
					
					
					
					field = fields.get(key);
					if (field && field.convert !== field.type.convert) {
						convertFields.push(key);
						continue;
					}
					
					me.set(key, fieldName[key]);
				}
				
				for (i = 0; i < convertFields.length; i++) {
					field = convertFields[i];
					me.set(field, fieldName[field]);
				}
				
			} else {
				if (fields) {
					field = fields.get(fieldName);
					
					if (field && field.convert) {
						value = field.convert(value, me);
					}
				}
				
				me[me.persistanceProperty][fieldName] = value;
	
				me.dirty = true;
				if (!me.editing) {
					me.afterEdit();
				}
			}
		}
	});
}