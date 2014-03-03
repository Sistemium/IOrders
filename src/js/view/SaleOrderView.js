var SaleOrderView = Ext.extend(AbstractView, {
	/**
	 * Config
	 */
	layout: {type: 'hbox', pack: 'justify', align: 'stretch'},
	/**
	 * Own
	 */
	createItems: function() {
		
		var metastore = Ext.getStore ('tables');
		
		this.offerCategoryStore = createStore('OfferCategory', Ext.apply({
			remoteFilter: true,
			filters:[{
				property: 'customer',
				value: this.saleOrder.get('customer')
			}],
			initLastActive: function(productStore, productRecs) {
				
				Ext.each(productRecs, function(product) {
					
					var lastActive = product.get('lastActive');
					
					if(lastActive) {
						
						var category = this.findRecord(
								'category',
								product.get('category'),
								undefined, undefined, true, true
							)
						;
						
						if (category){
							var min = category.get('minLastActive'),
								max = category.get('maxLastActive')
							;
							
							if(!min || min < lastActive) category.set('minLastActive', lastActive);
							if(!max || max < lastActive) category.set('maxLastActive', lastActive);
						}
						
					}
				}, this);
				
				this.didInitLastActive = true;
			}
		}, getGroupConfig('OfferCategory')));
		
		this.productCategoryList = Ext.create({
			xtype: 'expandableGroupedList',
			cls: 'x-product-category-list', allowDeselect: false, flex: 1,
			scroll: true,
			store: this.offerCategoryStore,
			itemTpl: getItemTpl('OfferCategory')
		});
		
		this.productCategoryList.lockScrollOnExpand
			&& this.productCategoryList.on('render', function() {this.scroller.disable();});

		this.productPanel = Ext.create({
			xtype: 'panel',
			layout: {type: 'vbox', pack: 'justify', align: 'stretch'},
			flex: 3
		});
		
		this.items = [this.productCategoryList, this.productPanel];
		
		var summTpl = '<p>'
			+ 'Сумма заказа: <span class="'
				+ '<tpl if="totalGain &lt; 0"> red</tpl>'
				+ '<tpl if="totalCost &lt; orderThreshold"> yellow</tpl>'
			+ '">{totalCost}'
				+ '<tpl if="totalCost &gt; 0 || totalCostBonus &gt; 0"> ('
					+ '<tpl if="totalCost0 &gt; 0">'
						+ ' <span class="scheme0">{totalCost0}</span>'
					+ '</tpl>'
					+ '<tpl if="totalCost1 &gt; 0">'
						+ ' <span class="scheme1">{totalCost1}</span>'
					+ '</tpl>'
					+ '<tpl if="totalCostBonus &gt; 0">'
						+ ' <span class="schemeBonus">{totalCostBonus}</span>'
					+ '</tpl>'
				+ ' )</tpl>'
				+ '<tpl if="markupAgent"><span class="markup"> ({markupAgent}%)</span></tpl>'
			+ '</span>'
			
			+ '<tpl if="bonusRemains"> Остаток бонуса: <span <tpl if="bonusRemains &lt; 0">class="negative"</tpl> >{bonusRemains}</span></tpl>'
			// + '<tpl if="totalSelfCost"> Выгода: <span <tpl if="totalGain &lt; 0">class="negative"</tpl> >{totalGain}</span></tpl>'
		+ '</p>';
		
		var tt = tableHasColumn('SaleOrder','totalsTpl');
		
		if (tt) {
			var tc = tt.get('template');
			
			if (tc) {
				summTpl = tc;
			}
		}
		
		summTpl = new Ext.XTemplate(summTpl);
		
		var applySearch = function(field, event) {
			if (field.getValue() == '') {
				console.log ('SaleOrderSearch cleared');
				Ext.dispatch({
					controller: 'SaleOrder',
					action: 'toggleProductNameFilterOff',
					view: this.up('saleorderview')
				});
			} else {
				console.log ('SaleOrderSearch: ' + field.getValue());
				Ext.dispatch({
					controller: 'SaleOrder',
					action: 'toggleProductNameFilterOn',
					view: this.up('saleorderview'),
					searchFor: field.getValue()
				});
			}
		};
		
		var saleOrderToggleFn = function(segBtn, btn, pressed) {
			Ext.dispatch({
				controller: 'SaleOrder',
				action: 'onModeButtonTap',
				view: segBtn.up('saleorderview'),
				segBtn: segBtn,
				btn: btn,
				pressed: pressed
			});
		};
		
		var volumeDistinctMode = (IOrders.getItemPersistant('volumeDistinctMode') != 'false');
		
		this.productPanel.addCls(
			volumeDistinctMode ? 'modeDistinct' : 'modeCombo'
		);
		
		var stockMode = (IOrders.getItemPersistant('SaleOrder.stockMode') != 'false')
		
		this.stockThreshold = stockMode ? 1 : 0;
		
		var bb = {
			id: 'bottomToolbar', xtype: 'toolbar', dock: 'bottom',
			items: [
				{xtype: 'spacer'},
				{xtype: 'segmentedbutton', itemId: 'VolumeModes',
					allowDepress: true,
					items: [{
						text: 'К/Шт',
						altText: 'К/Шт',
						itemId: 'VolumeDistinctMode',
						name: 'VolumeDistinctMode',
						pressed: volumeDistinctMode,
						scope: this,
					}],
					listeners: {
						toggle: saleOrderToggleFn
					}
				},
				{xtype: 'segmentedbutton', itemId: 'StockModes',
					allowDepress: true,
					items: [{
						text: 'Только остатки',
						altText: 'Только остатки',
						itemId: 'StockMode',
						name: 'StockMode',
						pressed: stockMode,
						scope: this,
					}],
					listeners: {
						toggle: saleOrderToggleFn
					}
				},
				{xtype: 'spacer'},
				{xtype: 'segmentedbutton', itemId: 'GroupChanger',
					items: [{
							name: 'GroupLastname', itemId: 'GroupLastname', text: 'По производителю', scope: this
						},{
							name: 'GroupFirstname', itemId: 'GroupFirstname', text: 'По наименованию', scope: this, pressed: true
					}]
				}, {xtype: 'spacer'}, {
					text: this.indexBarMode ? 'Скрыть индекс' : 'Показать индекс',
					altText: !this.indexBarMode ? 'Скрыть индекс' : 'Показать индекс',
					itemId: 'ShowIndexBar',
					name: 'ShowIndexBar',
					hidden: this.indexBarMode == undefined,
					scope: this
				}, {
					text: summTpl.apply({totalCost: 0}),
					itemId: 'ShowCustomer',
					name: 'ShowCustomer',
					scope: this
				}
			],
			titleTpl: summTpl
		}
		
		if (!metastore.getById('Product').columns().getById('ProductlastName'))
			bb.items[1].disabled = true;
		
		this.dockedItems.push(bb);
		
		this.dockedItems[0].items.push(
			{
				xtype: 'searchfield',
				name: 'productSearch',
				itemId: 'ProductSearcher',
				placeHolder: 'Поиск по названию',
				listeners:{
					change: applySearch,
					action: function(f,e) {
						console.log ('SaleOrderSearch action');
					},
					focus: function (f,e) {
						setTimeout (function() {
							e.target.setSelectionRange (0, 9999);
						}, 1);
					}
				}
			},
			{itemId: 'ClearFilter', iconMask: true, iconCls:'delete', hidden:true, scope:this},
			{xtype: 'spacer'},
			{xtype: 'segmentedbutton', allowMultiple: true, itemId: 'ModeChanger',
				items: [
					{
						itemId: 'Active',
						text: 'Актив', altText: 'Актив',
						handler: Ext.emptyFn
					},
					{
						itemId: 'Charge',
						text: 'Нагрузки',
						handler: Ext.emptyFn,
						hidden: metastore.getById('Charge') ? false : true
					},
					{
						itemId: 'MML',
						text: 'MML',
						criteria: '.isMML',
						handler: Ext.emptyFn,
						hidden: tableHasColumn('Offer','isMML') ? false : true
					},
					{
						itemId: 'Bonus',
						text: 'Акции',
						criteria: '.hasAction',
						handler: Ext.emptyFn,
						hidden: tableHasColumn('Offer','hasAction') ? false : true
					},
					{
						itemId: 'ShowSaleOrder',
						text: 'Показать заказ',
						altText: 'Показать все',
						handler: Ext.emptyFn
					}
				],
				listeners: {
					toggle: saleOrderToggleFn
				}
			},
			{xtype: 'spacer'},
			{ui: 'save', name: 'Save', text: 'Завершить', scope: this},
			{ui: 'plain', iconMask: true, name: 'Add', iconCls: 'add', scope: this}
		);
	},
	
	/**
	 * Handlers
	 */
	
	onProdCatButtonTap: function() {

		this.productCategoryList.showBy(this.productCategoryBtn, 'fade');
	},
	
	/**
	 * Overridden
	 */
	
	initComponent: function() {

		//this.indexBarMode = IOrders.getItemPersistant('indexBarMode') == 'true';

		SaleOrderView.superclass.initComponent.apply(this, arguments);
	}
});
Ext.reg('saleorderview', SaleOrderView);