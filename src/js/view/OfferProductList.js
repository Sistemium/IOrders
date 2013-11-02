var offerProductListConfig = function (options) {
	
	return Ext.apply(options, {
		
		xtype: 'expandableGroupedList',
		cls: 'x-product-list',
		itemTpl: getItemTpl('OfferProduct'),
		selectedItemCls: 'x-product-selected',
		
		listeners: {
			
			itemswipe: function(list, idx, item, event) {
				if (!list.disableSwipe) {
					Ext.defer(function() {
						Ext.dispatch({
							controller: 'Main', action: 'onListItemSwipe',
							list: list, idx: idx, item: item, event: event
						});
					},100);
				}
			},
			
			itemtap: function(list, idx, item, event) {
				
				Ext.dispatch({
					controller: 'SaleOrder', action: 'onListItemTap',
					list: list, idx: idx, item: item, event: event
				});
				
			},
			
			itemdoubletap: function (list, idx, item, el) {
				var rec = list.getRecord (item);
				
				if (rec) {
					
					var valueFields = {},
						targetGroups =[],
						iel = Ext.get(el.target),
						fieldGroups = [
							{
								title: 'Количество',
								fields: ['volume0', 'volume1', 'volumeBonus']
							},
							{
								title: 'Цена',
								fields: ['price0', 'price1', 'price10', 'price11']
							},
							{
								title: 'Скидка',
								fields: ['discount0', 'discount1', 'discount10', 'discount11']
							},
						]
					;
					
					var foundSomething;
					
					Ext.each(fieldGroups, function (fieldGroup) {
						Ext.each(fieldGroup.fields, function (fname) {
							
							if (iel.is('.'+fname+' *, .'+fname)) {
								
								foundSomething = valueFields[fieldGroup.title];
								
								if (!foundSomething) {
									foundSomething = valueFields[fieldGroup.title] = {
										fields: [],
										title: fieldGroup.title
									};
								}
								
								foundSomething.fields.push (fname);
								
							}
							
						});
					});
					
					Ext.iterate (valueFields, function(n,vf){
						targetGroups.push(vf);
					});
					
					if (targetGroups.length) {
						
						var value = rec.get(foundSomething.fields[0]);
						
						foundSomething.isActive = true;
						
						iel.addCls('editing');
						
						var keyboard = Ext.create({
							
							xtype: 'numkeyboard',
							value: value,
							
							onConfirmButtonTap: function(button, value) {
								
								if (this.iel) {
									this.iel.removeCls('editing');
									this.iel = false;
								}
								
								if (button == 'ok') {
									
									Ext.each (this.valueFields, function(valueField) {
										this.options [valueField] = value || 0
									}, this);
									
									Ext.dispatch (Ext.apply({
										controller: 'SaleOrder',
										action: 'setVolume'
									}, this.options));
								};
								
							}
						});
						
						//this.up('saleorderview').cmpLinkArray.push(this.keyboard);
						
						Ext.apply(keyboard, {
							record: rec,
							valueFields: foundSomething.fields,
							groupsObject: valueFields,
							fieldGroups: targetGroups,
							justOpen: true,
							iel: iel,
							options: {item: item, list: list, rec: rec}
						});
						
						keyboard.showBy(iel, false, false);
						keyboard.setValue(value);
					}
					
				}
			},
			
			update: function() {
				this.scroller && this.scroller.updateBoundary();
			}
			
		},
		
		scroll: {
			
			direction: 'vertical',
			threshold: 35 /*,
			
			listeners: {
				scroll:function(s, o) {
					if (o.y)
						me.disableSwipe = true;
				},
				scrollend: function(s, o){
					me.disableSwipe = false;
				}
			}*/
			
		},
		
		onRender: function() {
			
			ExpandableGroupedList.prototype.onRender.apply(this, arguments);
			
			this.mon(this.el, 'taphold', function(event, item, obj) {
				
				var list = this,
					idx = list.indexOf(item)
				;
				
				Ext.dispatch({
					controller: 'SaleOrder', action: 'onListItemLongTap',
					list: list, idx: idx, item: item, event: event
				});
			}, this, {delegate: '.x-list-item'});
		}
		
	});

}