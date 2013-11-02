Ext.override(Ext.util.Filter, {
	
    createValueMatcher : function() {
        var me            = this,
            value         = me.value,
            anyMatch      = me.anyMatch,
            exactMatch    = me.exactMatch,
            caseSensitive = me.caseSensitive,
            escapeRe      = Ext.util.Format.escapeRegex;
        
        if (!value.exec) { 
            value = String(value);

            if (anyMatch === true) {
                value = escapeRe(value);
				value.length && (value = value.replace(' ', '.*'));
            } else {
                value = '^' + escapeRe(value);
                if (exactMatch === true) {
                    value += '$';
                }
            }
            value = new RegExp(value, caseSensitive ? '' : 'i');
         }
         
         return value;
    }
	
})