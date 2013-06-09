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
					
					var valueField,
						iel = Ext.get(el.target),
						volumes = [
							'volume0', 'volume1', 'volumeBonus',
							'price0', 'price1', 'price10', 'price11'
						]
					;
					
					Ext.each(volumes, function (fname) {
						
						if (iel.is('.'+fname+' *, .'+fname))
							valueField = fname;
						
					});
					
					if (valueField) {
						
						var value = rec.get(valueField),
							keyboard = valueField + 'Kbd'
						;
						
						iel.addCls('editing');
						
						if(!this[keyboard]) {
							
							this[keyboard] = Ext.create({
								
								xtype: 'numkeyboard',
								value: value,
								
								onConfirmButtonTap: function(button, value) {
									
									if (this.iel) {
										this.iel.removeCls('editing');
										this.iel = false;
									}
									
									if (button == 'ok') {
										
										this.options [valueField] = value || 0;
										
										Ext.dispatch (Ext.apply({
											controller: 'SaleOrder',
											action: 'setVolume'
										}, this.options));
									};
									
								}
							});
							
							this.up('saleorderview').cmpLinkArray.push(this.keyboard);
						}
						
						this[keyboard].showBy(iel, false, false);
						this[keyboard].iel = iel;
						this[keyboard].setValue(value);
						this[keyboard].options = {item: item, list: list, rec: rec};
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
					controller: 'SaleOrder', action: 'onProductListItemLongTap',
					list: list, idx: idx, item: item, event: event
				});
			}, this, {delegate: '.x-list-item'});
		}
		
	});

}