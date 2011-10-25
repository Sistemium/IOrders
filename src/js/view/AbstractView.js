var AbstractView = Ext.extend(Ext.Panel, {
	/**
	 * Own
	 */
	createDockedItmes: function() {
		
		this.dockedItems || (this.dockedItems = []);
		
		this.dockedItems = [{
			xtype: 'toolbar',
			dock: 'top',
			title: this.title,
			items: [{
				ui: 'back', iconMask: true,
				name: 'Back',
				iconCls: 'reply',
				scope: this
			}]
		}].concat(this.dockedItems);

		if (!this.isXType('saleorderview') && !this.isXType('encashmentview'))
			this.dockedItems[0].items.push ({
				ui: 'home', iconMask: true,
				name: 'Home',
				iconCls: 'home',
				scope: this
			});

	},
	createItems: Ext.EmptyFn,
	/**
	 * Overridden
	 */
	initComponent: function() {

		this.createDockedItmes();
		this.createItems();
		AbstractView.superclass.initComponent.apply(this, arguments);
	}
});
Ext.reg('abstractview', AbstractView);