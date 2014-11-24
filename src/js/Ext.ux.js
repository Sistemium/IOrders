Ext.override(Ext.Interaction, {controller: 'Main'});


Ext.override(Ext.DataView, {

	prepareData: function(data, index, record) {
        
		if (record) {
            Ext.apply(data, this.prepareAssociatedData(record));
			
			if (record.name && typeof record.name == 'function')
				Ext.apply(data, {name: record.name()})
			;
			
        }
		
        return data;
    }

});

Ext.override(Ext.Button, {
	handler: function(btn, e) {
		Ext.dispatch({action: 'onButtonTap', view: this, btn: btn, event: e});
	}
});



Ext.override(Ext.form.Toggle, {
	
	setValue: function(value) {
		
		value = (value === true || value === 1 ? 1 : 0);
		Ext.form.Toggle.superclass.setValue.call(this, value, this.animationDuration);
		
		var fieldEl = this.fieldEl;
		
		if(this.constrain(value) === this.minValue) {
			fieldEl.addCls(this.minValueCls);
			fieldEl.removeCls(this.maxValueCls);
		} else {
			fieldEl.addCls(this.maxValueCls);
			fieldEl.removeCls(this.minValueCls);
		}
	}
	
});


Ext.override ( Ext.util.Observable, {
	
	clearManagedListeners : function() {
        var managedListeners = this.managedListeners || [],
            ln = managedListeners.length,
            i, managedListener;
		
        for (i = 0; i < ln; i++) {
            managedListener = managedListeners[i];
            managedListener.item.un(managedListener.ename, managedListener.fn, managedListener.scope);
        }
		
        this.managedListeners = [];
    }

});


String.right = function (str, n){
    if (n <= 0)
       return "";
    else if (n > String(str).length)
       return str;
    else {
       var iLen = String(str).length;
       return String(str).substring(iLen, iLen - n);
    }
};


Ext.MessageBox.YESNO[1].text = 'Да';
Ext.MessageBox.YESNO[0].text = 'Нет';
Ext.Picker.prototype.doneButton = 'OK';
Ext.Picker.prototype.cancelButton = 'Отмена';

Ext.override(Ext.form.Text, {
	
	afterBlur: function () {
		document.body.scrollTop=0;
	}
	
});

if (typeof WebKitPoint == 'undefined') {
	Ext.Element.prototype.getXY = function () {
		var rect = this.dom.getBoundingClientRect();
		return [rect.left, rect.top];
	}
}