var NumericKeyboard = Ext.extend(Ext.Panel, {

	cls: 'x-keyboard',
	floating: true,
	//enter: 'down',
	
	listeners: {
		hide: function() {
			this.onConfirmButtonTap('cancel', this.field.getValue() || '');
			var me = this;
			Ext.defer (function(){
				Ext.destroy(me);
			});
		}
	},
	
	renderSelectors: {
		field: 'input.keyboard-value'
	},
	
	renderTpl: [
		'<div class="{baseCls}-body<tpl if="bodyCls"> {bodyCls}</tpl>"<tpl if="bodyStyle"> style="{bodyStyle}"</tpl>>',
			'<div class="keyboard-button-line title">',
				'<tpl for="fieldGroups">',
					'<div class="x-button <tpl if="isActive">x-button-pressed</tpl>">{title}</div>',
				'</tpl>',
			'</div>',
			'<div class="x-form-field-container">',
				'<input class="keyboard-value" value="{value}"/>',
				'<div class="x-field-mask"></div>',
			'</div>',
			'<div class="keyboard-button-line">',
				'<div class="x-button">1</div>',
				'<div class="x-button">2</div>',
				'<div class="x-button">3</div>',
				'<div class="x-button">⬅</div>',
			'</div>',
			'<div class="keyboard-button-line">',
				'<div class="x-button">4</div>',
				'<div class="x-button">5</div>',
				'<div class="x-button">6</div>',
				'<div class="x-button">-+</div>',
			'</div>',
			'<div class="keyboard-button-line">',
				'<div class="x-button">7</div>',
				'<div class="x-button">8</div>',
				'<div class="x-button">9</div>',
				'<div class="x-button">0</div>',
			'</div>',
//			'<div class="keyboard-button-line">',
//				
//			'</div>',
			'<div class="keyboard-button-line">',
				'<div class="x-button">.</div>',
				'<div class="x-button">OK</div>',
				'<div class="x-button">Отмена</div>',
			'</div>',
		'</div>'
	],

	setPos : function(update) {
        if (this.rendered && update) {
            var x, y,
				el = !this.ownerCt ? Ext.Element : this.ownerCt
			;
			
            x = el.getViewportWidth() - this.getWidth() - 10;
            y = el.getViewportHeight() - this.getHeight() - 150;
			
            this.setPosition(x, y);
        }
		
        return this;
    },

    onShow: function() {

    	NumericKeyboard.superclass.onShow.apply(this, arguments);
    	//this.setPos(true);
    },

	onRender: function() {

		Ext.apply(this.renderData, {value: this.value, fieldGroups: this.fieldGroups});
		NumericKeyboard.superclass.onRender.apply(this, arguments);

		this.getTargetEl().addListener('tap', this.onButtonTap, this, {delegate: '.x-button'});
	},

	onButtonTap: function(evt, domEl, o) {

		var value = this.field.getValue() || '',
			oper = domEl.innerText,
			el = Ext.get(domEl)
		;
		
		if (this.groupsObject && this.groupsObject[oper]){
			
			if (el.hasCls('x-button-pressed')) return;
			
			el.radioCls('x-button-pressed');
			this.valueFields = this.groupsObject[oper].fields;
			this.setValue (this.record.get(this.valueFields[0]));
			
			return;
			
		}

		switch(oper) {
			case '⬅' : {
				this.setValue(value.substring(0, value.length - 1));
				break;
			}
			case '?' : {
				break;
			}
			case '-+' : {
				if (value == '' || this.justOpen)
					this.setValue ('-');
				else if (value == '-')
					this.setValue ('');
				else
					this.setValue (value * -1)
				;
				break;
			}
			case 'OK' : {
				this.onConfirmButtonTap('ok', value);
				this.hide();
				break;
			}
			case 'Отмена' : {
				this.onConfirmButtonTap('cancel', value);
				this.hide();
				break;
			}
			default: {
				this.value = (this.justOpen ? '' : value) + oper ;
				this.setValue(this.value);
			}
		}
		
		this.justOpen = false;
		
	},

	setValue: function(value) {
		this.field.set({value: value || ''});
	},
	
	getValue: function() {
		this.field.getValue();
	}
	
});
Ext.reg('numkeyboard', NumericKeyboard);