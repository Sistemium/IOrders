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

Ext.gesture.Manager.onTouchStart = function(e) {

	var targets = [],
		target = e.target;

	if (e.stopped === true) {
		return;
	}

	// if (Ext.is.Android) {
	// 	if (!(target.tagName && ['input', 'textarea', 'select'].indexOf(target.tagName.toLowerCase()) !== -1)) {
	// 		e.preventDefault();
	// 	}
	// }

	if (this.isFrozen) {
		return;
	}

	if (this.startEvent) {
		this.onTouchEnd(e);
	}

	this.locks = {};

	this.currentTargets = [target];

	while (target) {
		if (this.targets.indexOf(target) !== -1) {
			targets.unshift(target);
		}

		target = target.parentNode;
		this.currentTargets.push(target);
	}

	this.startEvent = e;
	this.startPoint = Ext.util.Point.fromEvent(e);
	this.lastMovePoint = null;
	this.isClick = true;
	this.handleTargets(targets, e);

};

Ext.gesture.Manager.onTouchMove = function(e) {
	// if (!Ext.is.Android) {
	// 	e.preventDefault();
	// }

	if (!this.startEvent) {
		return;
	}

	if (Ext.is.Desktop) {
		e.target = this.startEvent.target;
	}

	if (this.isFrozen) {
		return;
	}

	var gestures = this.currentGestures,
		gesture,
		touch = e.changedTouches ? e.changedTouches[0] : e;

	this.lastMovePoint = Ext.util.Point.fromEvent(e);

	if (Ext.supports.Touch && this.isClick && !this.lastMovePoint.isWithin(this.startPoint, this.clickMoveThreshold)) {
		this.isClick = false;
	}

	for (var i = 0; i < gestures.length; i++) {
		if (e.stopped) {
			break;
		}

		gesture = gestures[i];

		if (gesture.listenForMove) {
			gesture.onTouchMove(e, touch);
		}
	}
};