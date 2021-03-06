Ext.regController('SaleOrder', {

	onBackButtonTap: function(options) {
		
		var view = options.view;
		
		view.ownerViewConfig.editing = !(options.closeEditing || false);
		view.ownerViewConfig.isNew = view.isNew;
		view.ownerViewConfig.saleOrderStatus = view.saleOrderStatus;
		view.ownerViewConfig.objectRecord = view.saleOrder;
		
		var finish = function () {
			IOrders.viewport.setActiveItem(
				Ext.create(view.ownerViewConfig)
				, IOrders.viewport.anims.back
			);
		}
		
		if (view.incomplete
			&& (view.saleOrder.get('processing') != 'draft'
				|| view.ownerViewConfig.saleOrderStatus != 'draft'
			)
		) {
			
			Ext.Msg.alert (
				'Внимание',
				view.incomplete + ' ' + 'Заказ переведен в "Черновик"',
				function() {
					view.saleOrder.set('processing', view.ownerViewConfig.saleOrderStatus = 'draft');
					view.ownerViewConfig.saleOrderStatus = 'draft';
					view.saleOrder.save ({
						callback: finish
					});
				}
			);
			
		} else
			finish()
		;
		
	},

	onAddButtonTap: function (options) {
		
		Ext.Msg.confirm('Внимание', 'Хотите добавить отдельный Заказ ?', function(yn){
			if (yn == 'yes'){
				Ext.dispatch (Ext.apply(options, {
					action: 'objectCreateView'
				}));
			}
		}, this);
		
	},
	
	objectCreateView: function (options) {
		var saleOrder = options.view.saleOrder,
			view = options.view,
			rec
		;
		
		view.isNew && saleOrder.set('processing', view.saleOrderStatus);
		
		Ext.dispatch(Ext.apply(options, {
			action: 'saveOffer'
		}));
		
		view.isNew = true;
		
		var tableRec = Ext.getStore('tables').getById('SaleOrder'),
			parentColumns = tableRec.getParentColumns()
		;
		
		rec = Ext.ModelMgr.create({serverPhantom: true}, 'SaleOrder');
		
		rec.editing = true;
		tableRec.columns().each(function(col) {
			if (col.get('editable')) {
				var colName = col.get('name');
				rec.set(colName, saleOrder.get(colName));
			}
		});
		rec.editing = false;
		rec.commit();
		
		rec.save ({ success: function(rec) {
			
			view.saleOrder = rec;
			
			Ext.dispatch(Ext.apply(options, {
				action: 'onClearFilterButtonTap',
				btn: undefined
			}));
			
			view.saleOrderPositionStore.load({
				limit: 0,
				remoteFilter: true,
				filters: [{
					property: 'saleOrder',
					value: rec.getId()
				}]		
			});
			
			(function (store) {
				
				store.remoteFilter = false;
				store.filterOnLoad = true;
				store.snapshot = false;
				
				store.load({
					limit: 0,
					remoteFilter: true,
					filters: view.startFilters (rec)
				});
				
			}) (view.offerProductStore);
			
		}});
	},
	
	onShowCustomerButtonTap: function(options) {
		
		var view = options.view,
			store = Ext.getStore('OfferTotal'),
			tablesStore = Ext.getStore('tables'),
		    table = tablesStore.getById('OfferTotal')
		;
		
		if (!table) {
			return;
		}
		
		var formPanel = new Ext.form.FormPanel ({
			xtype: 'formpanel',
			disabled: true,
			items: [
				createFieldSet (table.columns(), 'OfferTotal', {}, {disabledCls: 'x-field-readonly'})
			]
		});
		
		var sheet = new Ext.Sheet({
			//height  : 200,
			stretchX: true,
			stretchY: true,
			enter: 'bottom',
			hideOnMaskTap: true,
			autoDestroy:true,
			
			layout: {
				type: 'vbox',
				align: 'stretch'
			},
			
			items: [ formPanel ],
			
			listeners: {
				hide: function () {
					Ext.defer(function() {sheet.destroy()}, 200);
				},
				show: function () {
					store.load({
						limit:0,
						callback: function(records, operation, success) {
							if (success) {
								formPanel.loadRecord(records[0]);
							}
						}
					});
				}
			}
			
		});
		
		sheet.show();
		
	},

	onSaveButtonTap: function(options) {
		
		var view = options.view,
			saleOrder = view.saleOrder
		;
		
		view.isNew && saleOrder.set('processing', view.saleOrderStatus);
		view.isNew = false;
		
		Ext.dispatch(Ext.apply(options, {
			action: 'saveOffer'
		}));
		
		Ext.dispatch(Ext.apply(options, {
			action: 'onBackButtonTap',
			closeEditing: true
		}));
		
	},

	saveOffer: function(options) {
		var view = options.view,
		    offerStore = view.offerProductStore,
		    saleOrderPosStore = view.saleOrderPositionStore
		;
		
		//offerStore.clearFilter(true);
		
		Ext.each(offerStore.getUpdatedRecords(), function(rec) {
			
			var posRec = saleOrderPosStore.findRecord(
					'product', rec.get('product'), undefined, undefined, true, true
				)
				, safeSelfCost = rec.get('selfCost')
				, selfCost = (safeSelfCost ? safeSelfCost : rec.get('priceOrigin'))
					* rec.get('volume')
			;
			
			if (!posRec) {
				saleOrderPosStore.add (posRec = Ext.ModelMgr.create(Ext.apply({
							saleOrder: view.saleOrder.getId()
						}, rec.data
					), 'SaleOrderPosition'
				));
			} else {
				posRec.editing = true;
				posRec.set(rec.data);
				posRec.editing = false;
			}
			
			posRec.set('selfCost', selfCost);
			
			rec.set('SaleOrderPosition_deviceCts',posRec.get('deviceCts'));
			
			rec.commit(true);
			
		});
		
		var tc = saleOrderPosStore.sum('cost'),
			tsc = 0,
			tc0 = 0,
			tc1 = 0,
			tc10 = 0,
			tc11 = 0,
			tcB = 0
		;
		
		saleOrderPosStore.each (function (rec) {
			tc0 += rec.get('price0') * rec.get('volume0');
			tc1 += rec.get('price1') * rec.get('volume1');
			tc10 += rec.get('price10') * rec.get('volume0');
			tc11 += rec.get('price11') * rec.get('volume1');
			tcB += rec.get('priceOrigin') * rec.get('volumeBonus');
			tsc += rec.get('priceAgent') * (rec.get('volume0') + rec.get('volume1'));
		});

		view.saleOrder.set ({
			totalCost: tc.toDecimal(2),
			totalCost1: tc1.toDecimal(2),
			totalCost0: tc0.toDecimal(2),
			totalCost11: tc11.toDecimal(2),
			totalCost10: tc10.toDecimal(2),
			totalCostBonus: tcB.toDecimal(2),
			totalSelfCost: tsc.toDecimal(2)
		});

		saleOrderPosStore.sync();

		view.saleOrder.save();
		view.saleOrder.commit(true);

		if (view.bonusCost > 0) {
			view.customerRecord.set (
				'bonusCost',
				(view.bonusCost - tc).toDecimal(2)
			);
			view.customerRecord.save();
			view.customerRecord.commit();
		}

	},

	calculateTotalCost: function(options) {
		
		var view = options.view,
			btb = view.getDockedComponent('bottomToolbar'),
			data = {
				totalCost: view.saleOrder.get('totalCost') || 0,
				totalCost0: view.saleOrder.get('totalCost0') || 0,
				totalCost1: view.saleOrder.get('totalCost1') || 0,
				totalCost10: view.saleOrder.get('totalCost10') || 0,
				totalCost11: view.saleOrder.get('totalCost11') || 0,
				totalCostBonus: view.saleOrder.get('totalCostBonus') || 0,
				totalSelfCost: view.saleOrder.get('totalSelfCost')
					|| view.offerProductStore.sum('selfCost') || 0,
				orderThreshold: view.saleOrder.get('orderThreshold') || 0,
				bonusRemains: view.saleOrder.get('isBonus') ? (view.bonusCost - tc) : undefined
			}
		;
		
		data.markupAgent = data.totalSelfCost > 0
			? ((data.totalCost - data.totalSelfCost) / data.totalSelfCost * 100.0).toDecimal(1)
			: undefined
		;
		
		Ext.iterate(data, function(k,v,o) {
			
			if (typeof v == 'number')
				o[k] = v.toDecimal(2);
			
		});
		
		btb.getComponent('ShowCustomer').setText( btb.titleTpl.apply (data));
		
		var ocs = Ext.getStore('OfferCharge');
		
		if (ocs) {
			ocs.load({
				limit:0
			})
		}
		
		var ots = Ext.getStore('OfferTotal');
		
		if (ots) {
			ots.load({
				limit:0
			})
		}
		
	},
	
	onChargeBaseTap: function (options) {
		
		var rec = options.rec,
			store = Ext.getStore('OfferCharge')
		;
		
		store.load({
			limit:0
		});
		
		Ext.dispatch(Ext.apply(options, {
			action: 'toggleFilterPanelOn',
			filterName: 'Charge',
			filterStore: store,
			rec: rec
		}));
		
	},
	
	toggleChargeOn: function (options) {
		
		Ext.dispatch(Ext.apply(options, {
			action: 'onChargeBaseTap'
		}));
		
	},
	
	toggleChargeOff: function (options) {
		
		Ext.dispatch(Ext.apply(options, {
			action: 'onClearFilterButtonTap',
			btn: undefined
		}));
		
	},
	
	onChargePanelListItemSelect: function (options) {
		
		var view = options.view,
			ops = view.offerProductStore,
			rec = options.list.store.getAt(options.idx)
		;
		
		ops.filtersSnapshot = ops.filters.items;
		ops.clearFilter(true);
		ops.filter({property: 'charge', value: rec.get('id')});
		
		Ext.dispatch(Ext.apply(options, {
			action: 'beforeFilterofferProductStore'
		}));
		
		Ext.dispatch(Ext.apply(options, {
			action: 'afterFilterofferProductStore',
			filterSet: true
		}));
		
		view.chargeMode = true;
		
		var cf = view.dockedItems.get(0).getComponent('ClearFilter');
		
		cf && cf.show('fade');
		
		options.panel.hide();
	},
	
	onBonusPanelListItemSelect: function (options) {
		
		var view = options.view,
			ops = view.offerProductStore,
			listStore = options.list.store
			rec = listStore.getAt(options.idx),
			fs = view.bonusProductStore,
			fieldName = options.fieldName || 'product',
			segBtn = view.getDockedComponent('top').getComponent('ModeChanger'),
			btnBonus = segBtn.getComponent('Bonus')
		;
		
		segBtn.setPressed(btnBonus,false);
		
		fs.clearFilter(true);
		
		fs.filter ({
			property: 'actionVariant',
			value: rec.getId()
		})
		
		ops.filters.items && (ops.filtersSnapshot = ops.filters.items);
		ops.clearFilter(true);
		
		ops.bonusFilter = new Ext.util.Filter({
			filterFn: function(item) {
			return fs.findExact(fieldName, item.get(fieldName)) !== -1;
		}});
		
		ops.filter (ops.bonusFilter);
		
		Ext.dispatch(Ext.apply(options, {
			action: 'beforeFilterofferProductStore'
		}));
		
		Ext.dispatch(Ext.apply(options, {
			action: 'afterFilterofferProductStore',
			filterSet: true
		}));
		
		view.bonusMode = true;
		
		var cf = view.dockedItems.get(0).getComponent('ClearFilter');
		
		cf && cf.show('fade');
		
		options.panel.hide();
	},
	
	onListItemTap: function(options) {
		
		var list = options.list,
			listEl = list.getEl(),
			rec = list.getRecord(options.item),
			tapedEl = Ext.get(options.event.target),
			view = (options.view = list.up('saleorderview'))
		;
		
		if (listEl.hasCls('x-product-category-list')) {
			
			Ext.dispatch(Ext.apply(options, {action: 'onProductCategoryListItemTap'}));
			return;
		
		} else if(listEl.hasCls('x-deps-list')) {
			
			Ext.dispatch(Ext.apply(options,{
				action: 'launchOfferView'
			}));
			
			return;
			
		};
		
		if (rec && tapedEl) {
			
			if ( tapedEl.is('.plus, .plus *, .minus, .minus *') ){
				
				Ext.dispatch(Ext.apply(options, {
					action: 'onPlusMinusTap',
					rec: rec
				}));
				
			} else if ( tapedEl.is('.chargeBase, .chargeBase *') ){
				
				Ext.dispatch(Ext.apply(options, {
					action: 'onChargeBaseTap',
					rec: rec
				}));
				
			} else if ( tapedEl.is('.pricesCombo, .pricesCombo *') ){
				
				rec.editing = true;
				rec.set('pricesUncombo', rec.get('pricesUncombo') ? false : true);
				rec.editing = false;
				rec.commit();
				
				Ext.defer(function() {
					list.updateOffsets();
					list.scroller && list.scroller.updateBoundary();
				}, 500, list);
				
			} else if ( tapedEl.is('.folderUnfolder, .folderUnfolder *') ){
				
				rec.editing = true;
				rec.get('unfolded') && rec.get('pricesUncombo')
					&& rec.set('pricesUncombo', false)
				;
				rec.set('unfolded', rec.get('unfolded') ? false : true);
				rec.editing = false;
				rec.commit();
				
				options.list && view.modeActive && (function (el) {
					Ext.each (
						el.query(view.modeActive),
						function (dom) {Ext.get(dom).up('.x-list-item').addCls('active')}
					);
				}) (Ext.get(options.list.getNode(rec)));
				
				Ext.defer(function() {
					this.updateOffsets();
					this.scroller && this.scroller.updateBoundary();
				}, 50, list);
				
			} else if ( /(taste|needle|quoted)([ ]|$)/.test(options.event.target.className) ){
				
				var 
					item = options.item,
					iel = (options.iel = Ext.get(item)),
					tapedCls = tapedEl.dom.classList[0]
				;
				
				Ext.defer (function() {
					Ext.dispatch(Ext.apply(options, {
						action: 'toggleParticleFilter',
						filterField: rec.get(tapedCls) ? tapedCls : 'name'
					}));
				}, 100);
				
			} else if(view.bonusProgramStore && tapedEl.is('.hasAction, .hasAction *')) {
				
				Ext.dispatch(Ext.apply(options, {
					action: 'toggleBonusPanelOn',
					rec: rec
				}));
				
			} else if(tapedEl.is('.checkable, .checkable *')) {

				Ext.dispatch(Ext.apply(options, {
					action: 'toggleCheckableField',
					rec: rec
				}));

			}
			
		}
		
	},
	
	launchOfferView: function(options) {
		
		var oldCard = IOrders.viewport.getActiveItem();
		
		var newCard = Ext.create({
			
			xtype: 'saleorderview',
			saleOrder: options.saleOrder,
			saleOrderStatus: options.saleOrderStatus,
			isNew: options.isNew,
			stockThreshold: 1,
			
			ownerViewConfig: {
				
				xtype: 'navigatorview',
				layout: IOrders.newDesign
					? {type: 'hbox', pack: 'justify', align: 'stretch'}
					: 'fit',
				extendable: oldCard.extendable,
				isObjectView: oldCard.isObjectView,
				isSetView: oldCard.isSetView,
				objectRecord: oldCard.objectRecord,
				tableRecord: oldCard.tableRecord,
				ownerViewConfig: oldCard.ownerViewConfig
				
			}
			
		});
		
		var failureCb = function (n) {
			Ext.Msg.alert ('Ошибка', 'Не получилось загрузить список '+n, function() {
				oldCard.setLoading(false);
			});
		};
		
		oldCard.setLoading(true);
		
		if (Ext.ModelMgr.getModel('Price'))
			newCard.hasPriceTable = true
		;
		
		if (Ext.ModelMgr.getModel('Setting')){
			Ext.getStore('Setting').load(function(r,c,s) {
				if (r.length)
					newCard.dohodThreshold = r[0].get('dohodThreshold');
				else
					newCard.dohodThreshold = 0;
			})
		}
		
		newCard.startFilters = function(saleOrder) {
			
			var result = [{
				property: 'customer',
				value: saleOrder.get('customer')
			}];
			
			if (tableHasColumn ('Offer', 'saleOrder')) {
				result.push({
					property: 'saleOrder',
					value: saleOrder.get('id')
				},{
					property: 'stockLevel',
					value: newCard.stockThreshold,
					gte: true
				})
			}
			
			return result;
		};
		
		newCard.offerProductStore = createStore( 'Offer',
			this.configOfferStore ( Ext.apply (options, {
				view: newCard
			}))
		);
		
		newCard.offerCategoryStore.load({
			limit: 0,
			callback: function(r, o, s) {
				
				if (!s) {
					failureCb('категорий')
				} else {
					Ext.dispatch ( Ext.apply ( options, {
						action: 'onOfferCategoryStoreLoad',
						view: newCard
					}))
				}
			}
		});
		
		var ocs = Ext.getStore('OfferCharge');
		
		if (ocs) {
			
			ocs.filters.clear();
			ocs.filters.add(new Ext.util.Filter({
				property: 'saleOrder',
				value: options.saleOrder.get('id'),
				exactMatch: true
			}));
			
			var segBtn = newCard.getDockedComponent('top').getComponent('ModeChanger'),
				chargeBtn = segBtn.getComponent('Charge')
			;
			
			chargeBtn && chargeBtn.mon (ocs, 'load', function (store, records, success) {
				chargeBtn.setBadge (records.length || null);
				if (records.length)
					newCard.incomplete = 'Не выполнено требование по нагрузке.';
				else
					newCard.incomplete = false;
			});
			
			ocs.load({
				limit:0
			})
		};
		
		var ots = Ext.getStore('OfferTotal');
		
		if (ots) {
			
			ots.filters.clear();
			ots.filters.add(new Ext.util.Filter({
				property: 'saleOrder',
				value: options.saleOrder.get('id'),
				exactMatch: true
			}));
			
			var totalsBtn = newCard.getComponent('bottomToolbar').getComponent('ShowCustomer');
			
			totalsBtn.messagesShown = {};
			
			totalsBtn && totalsBtn.mon (ots, 'load', function (store, records, success) {
				var badgeValue = null;
				if (records.length && records[0].get('isWarning')) {
					badgeValue = 1;
				}
				totalsBtn.setBadge (badgeValue);
				
				var messageId;
				
				if (records.length && (messageId = records[0].get('messageId'))) {
					
					if (!totalsBtn.messagesShown[messageId]) {
						
						Ext.Msg.alert ('Внимание', records[0].get('messageText'), function(v) {
							totalsBtn.messagesShown[messageId] = v || true;
						});
					}
				}
			});
			
			ots.load({
				limit:0
			})
		};
	},
	
	onOfferCategoryStoreLoad: function(options){
		
		var view = options.view
		;
		
		view.saleOrderPositionStore = createStore(
			'SaleOrderPosition', {
				remoteFilter: true,
				filters: [{
					property: 'saleOrder',
					value: view.saleOrder.getId()
			}]}
		);
		
		var defaultSchema = '0',
			schemaStore = Ext.getStore('SalesSchema'),
			volumeFn
		;
		
		if (tableHasColumn('SaleOrder','salesSchema')) {
			
			var schemaId = view.saleOrder.get('salesSchema');
			
			defaultSchema = (function(id) {
				switch (id) {
					case 3: return 'Bonus';
					case 2: return '0';
				}
				return '1';
			}) (schemaId);
			
			if (schemaStore) {
				
				var schemaRecord = schemaStore.getById(schemaId),
					volumeFnName = schemaRecord.get('volumeFn');
				
				if (volumeFnName) {
					
					volumeFn = function (data) {
						return schemaRecord[volumeFnName+'Volumes']
							(data, schemaRecord.get('ratio1'), schemaRecord.get('ratio0'));
					};
					
					defaultSchema = undefined;
				}
				
			}
			
		} else if (tableHasColumn('SaleOrder','isWhite')) {
			
			view.saleOrder.get('isWhite') == 1 && (
				defaultSchema = '1'
			)
			
		}
		
		view.productList = view.productPanel.add( offerProductListConfig ({
			flex: 3,
			store: view.offerProductStore,
			pinHeaders: false,
			defaultVolume: defaultSchema ? 'volume' + defaultSchema : undefined,
			volumeFn: volumeFn
		}));
		
		view.productListIndexBar = view.productPanel.add(
			new HorizontalIndexBar({
				hidden: !view.indexBarMode,
				list: view.productList}
			)
		);
		
		view.offerProductStore.load({
			limit: 0,
			callback: function(r, o, s) {
				
				if (s) {
					
					view.productPanel.doLayout(); 	
					view.offerProductStore.remoteFilter = false;
					
					Ext.dispatch ( Ext.apply ( options, {
						action: 'onOfferLoad'
						, view: view
						, callback: function () {
							
							if (view.bonusProgramStore && view.bonusProductStore) {
								
								view.bonusProgramStore.filter({
									property: 'isFirstScreen',
									value: true
								});
								
								view.bonusProductStore.filterBy(function(bpItem) {
									return view.bonusProgramStore.findExact(
										'id',
										bpItem.get('actionVariant') || bpItem.get('bonusProgram')
									) !== -1
								});
								
								view.offerProductStore.filter (
									view.offerProductStore.bonusProductFilter
								);
								
							} else {
								view.offerProductStore.filterBy (function() {
									return false;
								});
							}
							
							view.productListIndexBar.loadIndex();
							
							IOrders.viewport.getActiveItem().setLoading(false);
							
							IOrders.viewport.setActiveItem (view);

                            Ext.dispatch(Ext.apply(options, {action: 'expandFocusedProduct'}));
							
						}
					}));
					
				} else {
					failureCb('остатков')
				}
				
			}
		});
		
	},
	
	configOfferStore: function (options) {
		
		var view = options.view,
			rec = options.saleOrder
		;
		
		var config = {
			
			remoteFilter: true,
			remoteSort: false,
			groupField: 'firstName',
			filters: view.startFilters(rec),
			
			sorters: [
				{property: 'firstName', direction: 'ASC'},
				{property: 'name', direction: 'ASC'}
			],
			
			getGroupString: function(rec) {
				return rec.get(this.groupField);
			},
			
			listeners: {
				
				load: function (store, records) {
					
					!view.offerCategoryStore.didInitLastActive
						&& view.offerCategoryStore.initLastActive.apply(view.offerCategoryStore,arguments)
					;
					
					var sname = '',
						needle
					;
					
					this.filters.clear(true);
					
					Ext.each (records, function(rec) {
						
						sname = rec.data['name'];
						sname = sname.replace (/("[^"]*")/g, '<span class="quoted">$1</span>');
						
						needle = rec.data['pieceVolume'];
						
						if (needle) {
							
							needle == Math.round(needle)
								&& (needle = needle.toDecimal(1))
							;
							
							sname = sname.replace (
								RegExp ('('+needle+'([.]0+|0*))$'),
								'<span class="needle">$1</span>'
							);
							
						}
						
						sname = sname.replace (
							/(красн\.|красное|кр\.(?![^\d][\d]+))/i,
							'<span class="taste red">$1</span>'
						);
						
						sname = sname.replace (
							/(бел\.|белое)/i,
							'<span class="taste white">$1</span>'
						);
						
						sname = sname.replace (
							/(п\/сух\.|п\/сл\.|сух\.|сл\.|брют)/i,
							'<span class="taste etc">$1</span>'
						);

						sname = sname.replace (
							/(подар[^ \.]*|под[^ \.]*[ \.]{1,2}упа[^ \.)]*|в п\/у[^ \.)]*|п\/у[^ \.)]*)/i,
							'<span class="red bold">$1</span>'
						);
						
						rec.data['name'] = sname;
						
					});
					
				}
				
			},
			
/*			filter: function(filters, value) {
				
				var bonusProductStore = view.bonusProductStore,
					bonusProgramStore = view.bonusProgramStore
				;
				
				if (bonusProgramStore && filters && (
						filters.contains && filters.contains(this.isFocusedFilter)
						|| filters == this.isFocusedFilter
					)
				) {
					
					bonusProgramStore.filter({property: 'isFirstScreen', value: true});
					
					bonusProductStore.filterBy(function(it) {
						return bonusProgramStore.findExact(
							'id',
							it.get('bonusProgram')) !== -1
								? true : false
						;
					});
					
				}
				
				Ext.data.Store.prototype.filter.apply(this, arguments);
				
				if(bonusProgramStore && filters && (
						filters.contains && filters.contains(this.isFocusedFilter)
						|| filters == this.isFocusedFilter
				)) {
					bonusProductStore.clearFilter(true);
					bonusProgramStore.clearFilter(true);
				}
				
			},*/
			
			volumeFilter: new Ext.util.Filter({
				filterFn: function(item) {
					return item.get('volume') > 0;
				}
			}),
			
			hasActionFilter: new Ext.util.Filter({
				filterFn: function(item) {
					return item.get('hasAction') > 0;
				}
			}),
			
			bonusProductFilter: new Ext.util.Filter({
				filterFn: function(item) {
					if (!view.bonusProductStore) return false;
					return (view.bonusProductStore.findExact('product'
						, item.get('product')
					) !== -1) ? true : false;
				}
			})
			
		}
		
		return config;
	},
	
	onOfferLoad: function (options) {
		
		var view = options.view
			, callback = options.callback
		;
		
		var saleOrderPositionStore = view.saleOrderPositionStore;
		
		saleOrderPositionStore.load({
			limit: 0,
			callback: function(records, operation, s) {
				if(s) {
					
					Ext.dispatch ( Ext.apply ( options, {
						action: 'onSaleOrderPositionLoad',
						records: records,
						callback: callback
					}));
					
				} else {
					failureCb('товаров')
				}
			}
		});
		
	},
	
	
	onSaleOrderPositionLoad: function (options) {
		
		var view = options.view,
			records = options.records,
			callback = options.callback
			tc = 0
		;
		
		// Sync with offer
		Ext.each(records, function(rec, idx, all) {
			
			var offerRec = view.offerProductStore.findRecord ( 'product'
				, rec.get('product'), undefined, undefined, true, true
			);
			
			if (offerRec) {
				
				//var volumes = ['volume', 'volume1', 'volumeBonus'];
				var prices = ['price0', 'price1', 'price10', 'price11'];
				var discounts = ['discount0', 'discount1', 'discount10', 'discount11'];
				
				offerRec.editing = true;
				offerRec.set(rec.data);
				
				Ext.each (prices, function(p, i) {
					var discount = Math.round(
						(rec.get(p) - rec.get('priceOrigin'))
							/ rec.get('priceOrigin') * 100.0
					);
					offerRec.set (discounts[i], discount || 0);
				});
				
				offerRec.editing = false;
				offerRec.commit(true);
				
			}
			
		});
		
		view.saleOrder.commit(true);
		
		var customer = view.saleOrder.get('customer');
		
		if (customer) {
			Ext.ModelMgr.getModel('Customer').load(customer, {
				success: function(rec) {
					view.customerRecord = rec;
					if (view.saleOrder.get('isBonus')){
						view.bonusCost = rec.get('bonusCost') + view.saleOrder.get('totalCost');
					};
					Ext.dispatch({
						controller: 'SaleOrder',
						action: 'calculateTotalCost',
						view: view
					});
				}
			});
		} else {
			console.log ('SaleOrder: empty customer');
		}
		
		Ext.dispatch ( Ext.apply ( options , {
			action: 'setUpBonusProgramming',
			callback: callback
		}));
		
	},
	
	setUpBonusProgramming: function (options) {
		
		var view = options.view,
			callback = options.callback,
			bonusModelName,
			bonusProductModelName
		;
		
		Ext.each ([
			'OfferAction',
			'BonusProgram'
		], function (name) {
			if (Ext.ModelMgr.getModel(name)) {
				bonusModelName = name;
				return false;
			}
			return true;
		});
		
		Ext.each ([
			'ActionVariantByProduct',
            'BonusProgramProduct'
		], function (name) {
			if (Ext.ModelMgr.getModel(name)) {
				bonusProductModelName = name;
				return false;
			}
			return true;
		});
		
		if (!bonusModelName || !bonusProductModelName){
			
			view.bonusProgramStore = undefined;
			console.log ('SaleOrder.launchOfferView bonusProgramStore = undefined');
			
			callback && callback.call();
			
		} else {
			
			view.bonusProgramStore =
				createStore(bonusModelName, getGroupConfig(bonusModelName))
			;
			
			view.bonusProductStore = Ext.getStore(
				bonusProductModelName
				//, Ext.apply(getSortersConfig('BonusProgramProduct', {}))
			);
			
			view.bonusProductStore.clearFilter(true);
			view.bonusProgramStore.clearFilter(true);
			
			view.bonusProductStore.remoteFilter = view.bonusProgramStore.remoteFilter = true;
			
			view.bonusProgramStore.filters.add({
				property: 'saleOrder',
				value: options.saleOrder.get('id')
			});
			
			Ext.dispatch ( Ext.apply ( options , {
				action: 'toggleBonusStartUp',
				callback: callback
			}));
			
		}
		
	},

	
	toggleBonusStartUp: function (options) {
		
		var callback = options.callback || Ext.emptyFn
			, view = options.view
			, me = this
		;
		
		view.bonusProgramStore.load({
			limit: 0,
			callback: function() {
				
				view.bonusProgramStore.remoteFilter = false;
				view.bonusProgramStore.clearFilter(true);
				
				var withMsgCount = view.bonusProgramStore.queryBy(function(rec){
					return rec.get('isWithMsg')
				}).getCount();
				
				if (withMsgCount)
					view.dockedItems.get(0).items.getByKey('ModeChanger')
						.items.getByKey('Bonus').setBadge(withMsgCount)
				;
				
				view.bonusProductStore.load({
					limit: 0,
					callback: function() {
						
						view.bonusProductStore.remoteFilter = false;
						
						if(view.saleOrderPositionStore.getCount()) {
							
						//	view.offerProductStore.filter (view.offerProductStore.volumeFilter);
							
						} else {
							
							/*view.on('activate', function() {
								view.customerRecord.getCustomerBonusProgram(function(bonusStore) {
									view.customerRecord.bonusProgramStore = bonusStore;
									Ext.dispatch(Ext.apply(options, {
										action: 'toggleBonusOn',
										view: view,
										atStart: true,
										bonusStore: bonusStore
									}));
								});
							});*/
							
						}
						
						view.bonusProductStore.remoteFilter = false;
						view.bonusProductStore.clearFilter(true);
						
						callback.call(this);
						
						Ext.dispatch (Ext.apply (options, {
							action: 'expandFocusedProduct'
							, view: view
							, firstScreen: true
						}));
					}
				});
			}
		})
		
	},

	onListItemSwipe: function(options) {
		
		var listEl = Ext.get(options.event.target),
			rec = options.list.store.getAt(options.idx),
			sign = options.event.direction === 'left' ? -1 : 1,
			factor = rec.get('factor'),
			defaultVolume = options.list.defaultVolume,
			volumeFn = options.list.volumeFn
		;
		
		var data = {
				action: 'setVolume',
				sign: sign,
				rec: rec,
				factor: factor,
				packageRel: rec.get('packageRel') || 1
			},
			fnamesTo = [],
			fnames = [
				'volume1', 'volume0','volumeBonus', 'packageRel', 'volumeCombo',
				'discount0', 'discount1','discount10','discount11'
			]
		;
		
		Ext.each (fnames, function (f) {
			
			if (listEl.hasCls(f) || listEl.is('.'+f+' *'))
				fnamesTo.push (f);
			
		});
		
		Ext.each(fnamesTo, function(fname) {
			
			if (fname == 'packageRel') {
				factor = rec.get(fname);
			}
			
			if (fname.match(/discount.*/)) {
				factor = 1.0;
			}
			
			((fname == 'volumeCombo' || fname == 'packageRel') && defaultVolume) && (
				fname = defaultVolume
			);
			
			var v = parseInt (rec.get(fname) || '0');
			
			if (fname == 'volumeCombo' || fname == 'packageRel') {
				fname = 'volumeCombo';
				v = rec.get('volume1') + rec.get('volume0');
			}
			
			data[fname] = v + sign * factor;
			
		});
		
		if (fnamesTo.length) {
			
			volumeFn && Ext.apply(data, volumeFn (data));
			Ext.dispatch( Ext.apply( options, data ));
			
		}
	},
	
	onPlusMinusTap: function(options) {
		
		var listEl = Ext.get(options.event.target),
			rec = options.rec,
			sign = listEl.is('.plus, .plus *') ? 1 : -1,
			factor = rec.get('factor'),
			defaultVolume = options.list.defaultVolume,
			volumeFn = options.list.volumeFn
		;
		
		var data = {
				action: 'setVolume',
				sign: sign,
				rec: rec,
				factor: factor,
				packageRel: rec.get('packageRel') || 1
			},
			fnamesTo = [],
			fnames = [
				'pkg', 'sht'
			]
		;
		
		Ext.each (fnames, function (f) {
			
			if (listEl.hasCls(f) || listEl.is('.'+f+' *'))
				fnamesTo.push (f);
			
		});
		
		Ext.each(fnamesTo, function(fname) {
			
			if (fname == 'pkg') {
				factor = data.packageRel;
			}
			
			if (defaultVolume) {
				fname = defaultVolume
			}
			
			var v = parseInt (rec.get(fname) || '0');
			
			if (fname == 'sht' || fname == 'pkg') {
				fname = 'volumeCombo';
				v = rec.get('volume1') + rec.get('volume0');
			}
			
			data[fname] = v + sign * factor;
			
		});
		
		if (fnamesTo.length) {
			
			volumeFn && Ext.apply(data, volumeFn (data));
			Ext.dispatch( Ext.apply( options, data ));
			
		}
	},

	toggleCheckableField: function (options) {

		// console.log (options);

		var rec = options.rec;
		var isCompDiscount = rec.get('isCompDiscount');
		var view = options.view || options.list && options.list.up('saleorderview');

		rec.editing = true;
		rec.set('isCompDiscount',!isCompDiscount);
		rec.editing = false;

		Ext.dispatch(Ext.apply(options, {
			action: 'saveOffer',
			view: view
		}));

		rec.commit();

	},
	
	setVolume: function (options) {
		
		var rec = options.rec,
		    view = options.view || options.list.up('saleorderview'),
			rel = parseInt(rec.get('rel')),
			priceAgent = rec.get('priceAgent')
		;
		
		if (rec.get('Restriction_tags')) return;
		
		var data = {
			volume: options.volume,
			discount: options.discount,
			cost0: 0,
			cost1: 0
		}, volume = 0;
		
		var setVolumeLogic = function(fname, vMin, vMax) {
			
			var v = options[fname];
			
			var gtf = function(f1, f2) {
				fname ==f1
					&& rec.get(f1) > options[f2]
					&& options[f2] < rec.get(f2)
					&& (v=options[f2])
				;
			};
			
			var ltf = function(f1, f2) {
				fname ==f1
					&& rec.get(f1) < options[f2]
					&& options[f2] > rec.get(f2)
					&& (v=options[f2])
				;
			};
			
			if (!v) {
				
				gtf ('discount0','discount10');
				gtf ('discount1','discount11');
				ltf ('discount10','discount0');
				ltf ('discount11','discount1');
				
			}
			
			v == undefined && (v = data[fname]);
			v == undefined && (v = parseFloat (rec.get(fname) || '0'));
			
			v = parseFloat(v) || 0;
			
			v < vMin && (v = vMin);
			v > vMax && (v = vMax);
			
			return (data[fname] = v);
			
		}
		
		Ext.each (['volume0', 'volume1', 'volumeBonus'], function (fname) {
			volume = setVolumeLogic (fname,0);
		});
		
		if (data.volume == undefined)
			data.volume = volume
		;
		
		volume = data.volume;
		
		var cost = 0,
			price = parseFloat (rec.get('priceOrigin') || '0'),
			dMin = -50,
			dMax = 400
		;
		
		Ext.each (['price0', 'price1', 'price10', 'price11'], function (fname) {
			if (options[fname]) {
				options[fname.replace(/[a-z]*(.*)/,'discount$1')] = (
					(options[fname] - price) / price * 100.0
				).toDecimal(5)
			}
		});
		
		var totalVol = 0;
		
		Ext.each (['0', '1'], function (fname) {
			
			totalVol += (
				data['volume'+fname] = Math.round(data['volume'+fname])
			);
			
		});
		
		var factor = rec.get('factor');
		var totalVolDelta = totalVol % factor;
		
		if (totalVolDelta) {
			var greaterVol = data.volume0 >= data.volume1 ? '0' : '1';
			data['volume'+greaterVol] += factor - totalVolDelta;
		}
		
		Ext.each (['0', '1'], function (fname) {
			
			var discountMin = dMin,
				discountMax = dMax
			;
			
			data['price'+fname] = (
				price * (1.0 + setVolumeLogic ('discount'+fname, dMin, dMax) / 100.0)
			) .toDecimal(2);
			
			var p1 = data['price1'+fname] = (
				price * (1.0 + setVolumeLogic ('discount1'+fname, dMin, dMax) / 100.0)
			) .toDecimal(2);
			
			var price1Min = rec.get('price1Min');
			
			if (p1 < price1Min){
				data['price1'+fname] = price1Min;
				data['discount1'+fname] = null;
			}
			
			data['cost'+fname] += (rel
				* parseFloat (data ['volume' + fname])
				* parseFloat (data ['price' + fname])
			);
			
		});
		
		cost = data.cost1 + data.cost0;
		
		(volume = data.volume1 + data.volume0 + data.volumeBonus) > 0 && (
			price = cost / volume
		);
		
		rec.editing=true;
		
			rec.set( Ext.apply( data, {
				price: price.toDecimal(2),
				volume: volume,
				cost: cost.toDecimal(2),
				selfCost: parseFloat(data.volume1 + data.volume0) * priceAgent
			}));
			
			rec.editing = false;
			
			Ext.dispatch(Ext.apply(options, {
				action: 'saveOffer',
				view: view
			}));
			
			Ext.dispatch(Ext.apply(options, {
				action: 'calculateTotalCost'
			}));
		
		rec.commit();
		
		options.list && view.modeActive && (function (el) {
			Ext.each (
				el.query(view.modeActive),
				function (dom) {Ext.get(dom).up('.x-list-item').addCls('active')}
			);
		}) (Ext.get(options.list.getNode(rec)));
		
	},
	
	toggleStockModeOn: function (options) {
		
		IOrders.setItemPersistant('SaleOrder.stockMode', 'true');
		
		options.view.stockThreshold = 1;
		
		Ext.dispatch(Ext.apply(options, {
			action: 'reloadProductList'
		}));
		
	},
	
	toggleStockModeOff: function (options) {
		
		IOrders.setItemPersistant('SaleOrder.stockMode', 'false');
		
		options.view.stockThreshold = 0;
		
		Ext.dispatch(Ext.apply(options, {
			action: 'reloadProductList'
		}));
		
	},

	reloadProductList: function (options) {
		
		var view = options.view,
			filters = view.startFilters(view.saleOrder),
			store = view.offerProductStore
		;
		
		store.remoteFilter = true;
		
		var filtersSnapshot = store.filters.clone().items;
		
		store.clearFilter(true);
		
		view.productList.blockRefresh = true;
		
		store.load({
			limit: 0,
			filters: filters,
			callback: function(r, o, s) {
				
				if (s) {
					
					store.remoteFilter = false;
					view.productList.blockRefresh = false;
					store.filter (filtersSnapshot);
					store.fireEvent('datachanged', store);
					Ext.dispatch(Ext.apply(options, {action: 'expandFocusedProduct'}));
					
				} else {
					console.log ('toggleStockModeOn failure loading offerProductStore');
				}
				
			}
		});
		
	},

	onProductCategoryListItemTap: function(options) {
		
		var list = options.list,
			rec = list.getRecord(options.item),
			view = list.up('saleorderview')
		;
		
		view.productList.setLoading(true);
		
		Ext.apply(options, {action: 'addOfferProductList', view: view, categoryRec: rec});
		
		Ext.defer(Ext.dispatch, 100, this, [options]);
	},

	
	onListItemLongTap: function(options) {
		
		var list = options.list,
			item = options.item,
			view = (options.view = list.up('saleorderview')),
			iel = (options.iel = Ext.get(item)),
			rec = list.getRecord(options.item),
			tapedEl = Ext.get(options.event.target)
		;
		
		if (iel) {
			
			iel.addCls('editing');
			
			view.pricePanel || Ext.dispatch ( Ext.apply ( options, {
				action: 'setUpDetailPanel'
			}));
			
			view.pricePanel.setHeight(list.getHeight() * 2 / 3);
			view.pricePanel.iel = iel;
			view.pricePanel.refreshData(list.getRecord(item));
		}
		
	},
	
	
	toggleParticleFilter: function (options) {
		
		var
			view = options.view,
			list = options.list,
			iel = options.iel,
			filterField = options.filterField || 'name'
		;
		
		var
			value = options.event.target.innerText,
			store = view.offerProductStore,
			groupEl = iel.up ('.x-list-group'),
			groupClass = groupEl && groupEl.dom.className,
			willResume = false
		;
		
		list.suspendEvents (false);
		
		if (!store.filters.containsKey(value))
			
			store.filter ( {
				id: value,
				property: filterField,
				value: (filterField == 'name')
					? '>'+value+'<'
					: value,
				anyMatch: (filterField == 'name'),
				exactMatch: (filterField != 'name'),
				caseSensitive: false
			});
			
		else{
			
			store.filters.removeByKey (value);
			var f = store.filters.clone();
			store.clearFilter(true);
			store.filters = f;
			store.filter();
			
		}
		
		if (groupClass) try {
			
			var groupsToExpand = list.getEl().query('.'+groupClass.replace(/ +/g,'.'));
			
			if (groupsToExpand) {
				
				var el = Ext.get(groupsToExpand[0]);
				
				if (el) {
					
					willResume = true;
					
					Ext.defer(function() {
						
						list.onListHeaderTap(
							false, el.down('.x-list-header')
						);
						
						list.resumeEvents();
						
					}, 50, list);
				}
			}
			
		} catch (e) { IOrders.logEvent ({
			module:'SaleOrder',
			action: 'toggleParticleFilter' ,
			data: 'groupClass:' + groupClass + ' value:' + value
		})}
		
		!willResume && list.resumeEvents();
		
	},
	
	
	setUpDetailPanel: function (options) {
		
		var view = options.view,
			list = options.list,
			item = options.item
		;
		
		var cfg = {
			
			xtype: 'tabpanel',
			tabBarDock: 'top',
			tabBar: {ui: 'light', height: 50},
			floating: true,
			width: list.getWidth() / 2,
			
			items: [
				{
					xtype: 'list',
					title: 'Товар',
					scroll: false,
					itemId: 'productList',
					itemTpl: getItemTplMeta('Product', {useDeps: false, groupField: 'category'}).itemTpl,
					store: createStore('Product', Ext.apply(getSortersConfig('Product', {})))
				},
				{
					xtype: 'list',
					title: 'Отгрузки',
					itemId: 'shipmentList',
					itemTpl: getItemTpl('ShipmentProduct'),
					store: createStore('Shipment', Ext.apply(getSortersConfig('Shipment', {})))
				}
			],
			
			listeners: {
				hide: function() {
					this.iel.removeCls('editing');
				},
				cardswitch: function(panel, newC, oldC) {
					IOrders.setItemPersistant('productInfoTab', newC.itemId);
				}
			}
			
		};
		
		if (view.hasPriceTable)
			cfg.items.push({
				xtype: 'list',
				title: 'Цены',
				itemId: 'priceList',
				itemTpl: getItemTplMeta('Price', {
					useDeps: false,
					groupField: 'category',
					filterObject: {modelName: 'Product'}
				}).itemTpl,
				store: createStore('Price', Ext.apply(getSortersConfig('Price', {})))
			})
		;
		
		cfg.refreshData = function (productRec) {
			
			var productInfoStore = view.pricePanel.getComponent('productList').store,
				priceStore = view.hasPriceTable ? view.pricePanel.getComponent('priceList').store : undefined,
				shipmentStore = view.pricePanel.getComponent('shipmentList').store
			;
			
			shipmentStore.clearFilter(true);
			
			productInfoStore.load({
				
				filters: [{property: 'id', value: productRec.get('product')}],
				scope: view,
				limit: 0,
				
				callback: function() {
					
					shipmentStore.load({
						scope: this,
						limit: 0,
						filters: [{property: 'customer', value: view.saleOrder.get('customer')}],
						sorters: [{ property: 'date', direction: 'DESC' }],
						
						callback: function() {
							var shipPosStore = this.pricePanel.shipPositionStore
								= createStore('ShipmentPosition', {})
							;
							
							shipPosStore.load({
								filters: [{property: 'product', value: productRec.get('product')}],
								scope: this,
								limit: 0,
								callback: function() {
									
									shipmentStore.filterBy(function(item) {
										return shipPosStore.findExact('shipment', item.get('id')) !== -1;
									}, this);
									
									shipmentStore.each(function(rec) {
										
										var pos = shipPosStore.findRecord ('shipment'
											, rec.getId(), undefined, undefined, true , true
										);
										
										Ext.apply(rec.data, {
											//name: productInfoStore.getAt(0).get('name'),
											price: pos.get('price0'), volume: pos.get('volume')
										});
									});
									
									this.pricePanel.showBy(this.pricePanel.iel, false, false);
									this.pricePanel.setActiveItem(IOrders.getItemPersistant('productInfoTab'));
									this.pricePanel.getComponent('shipmentList').refresh();
									
									this.hasPriceTable && priceStore.load({
										filters: [{property: 'product', value: productRec.get('product')}],
										scope: this,
										limit: 0
									});
									
								}
							});
						}
					});
				}
			});
		}
		
		
		view.cmpLinkArray.push(
			view.pricePanel = Ext.create(cfg)
		);
		
	},

	addOfferProductList: function(options) {
		
		var rec = options.categoryRec,
			view = options.view,
		    offerProductStore = view.offerProductStore,
		    filters = []
		;
		
		offerProductStore.clearFilter(true);
		
		rec && filters.push({
			property: 'category',
			value: rec.get('category'),
			exactMatch: true
		});
		
		view.isShowSaleOrder && filters.push(offerProductStore.volumeFilter);
		view.bonusMode && filters.push(offerProductStore.bonusFilter);
		view.productSearchFilter && filters.push(view.productSearchFilter);

		offerProductStore.filter(filters);

		view.productListIndexBar.loadIndex();
		view.productList.scroller && view.productList.scroller.scrollTo ({y:0});
		
		if (view.modeActive)
			Ext.dispatch (Ext.apply (options, {action: 'toggleActiveOn'}));

		Ext.dispatch(Ext.apply(options, {action: 'expandFocusedProduct'}));

		view.productList.setLoading(false);
	},

	expandFocusedProduct: function(options) {
		
		var view = options.view,
			doms = view.productList.getEl().query('.x-list-item .isNonHidable')
		;
		
		Ext.each(doms, function(dom) {
			var el = Ext.get(dom);
			el = el && el.up('.x-list-item');
			el = el && el.addCls('active').up('.x-list-group-items');
			el = el && el.addCls('hasActive');
			if (el && options.firstScreen) {
				el.addCls('expanded')
					.prev('.x-list-header')
					.addCls('display-none');
			}
		});
		
		doms = view.productList.getEl().query('.x-list-group');
		
		if (doms.length == 1 && !view.modeActive && !options.firstScreen) {
			Ext.get(doms[0]).down('.x-list-group-items').addCls('expanded');
		}
	},

	toggleActiveOn: function( options ) {
		var view = options.view,
			criteria = options.criteria || view.modeActive || '.active'
		;
		
		if (view.modeActive && view.modeActive != criteria)
			Ext.dispatch(Ext.applyIf({action: 'toggleActiveOff', criteria: view.modeActive},options))
		;

		view.modeActive = criteria;

		var addActiveCls = function(dom) {
			var el = Ext.get(dom);

			el.up('.x-list-item').addCls('active').up('.x-list-group-items').addCls('hasActive');
		}; 

		//productList
		Ext.each (view.productList.getEl().query('.x-list-item ' + criteria), addActiveCls);

		//categoryList
		view.productCategoryList.lockScrollOnExpand
            && view.productCategoryList.scroller
			&& view.productCategoryList.scroller.enable();
		Ext.each(view.productCategoryList.getEl().query('.x-list-item ' + criteria), addActiveCls);
	},
	
	toggleVolumeDistinctModeOn: function (options) {
		var view = options.view;
		view.productPanel.addCls('modeDistinct').removeCls('modeCombo');
		IOrders.setItemPersistant('volumeDistinctMode', 'true');
	},
	
	toggleVolumeDistinctModeOff: function (options) {
		var view = options.view;
		view.productPanel.addCls('modeCombo').removeCls('modeDistinct');
		IOrders.setItemPersistant('volumeDistinctMode', 'false');
	},
	
	toggleActiveOff: function( options ) {
		var view = options.view;

		view.modeActive = false;

		var removeActiveCls = function(dom) {
			var el = Ext.get(dom);

			el.removeCls('hasActive');
			Ext.each(el.query('.x-list-item'), function (dom) {Ext.get(dom).removeCls('active')});
		};

		Ext.each(view.productList.getEl().query('.x-list-group-items'), removeActiveCls);

        view.productCategoryList.scroller && view.productCategoryList.scroller.scrollTo({y:0});
		view.productCategoryList.lockScrollOnExpand
            && view.productCategoryList.scroller
			&& view.productCategoryList.scroller.disable();
		Ext.each(view.productCategoryList.getEl().query('.x-list-group-items'), removeActiveCls);
	},
	
	beforeFilterofferProductStore: function (options) {
		
		var view = options.view,
			currentCategorySelection = view.productCategoryList.getSelectedRecords()
		;
		
		view.productCategoryList.selectionSnaphot
			|| (view.productCategoryList.selectionSnaphot = currentCategorySelection);
		
		view.productCategoryList.deselect(
			currentCategorySelection
		);
		
		view.offerCategoryStore.remoteFilter = false;
		view.offerCategoryStore.clearFilter(true);
		view.offerCategoryStore.filter(new Ext.util.Filter({
			filterFn: function(item) {
				return view.offerProductStore.findExact('category', item.get('category')) > -1 ? true : false;
			}
		}));
		
	},

	toggleProductNameFilterOn: function(options) {
		
		var view = options.view
			currentProductFilters = view.offerProductStore.filters.clone().items,
			re = new RegExp(options.searchFor.replace(/[ ]/g,'.*'),'ig')
		;
		
		view.setLoading(true);
		
		view.offerProductStore.clearFilter(true);
		view.offerProductStore.suspendEvents();
		view.offerProductStore.filter( view.productSearchFilter = {
			filterFn: function(item) {
				return item.get('name').match(re)
					|| item.get('firstName').match(re)
					|| item.get('extraLabel').match(re)
				;
			}
		});
		
		var foundCnt = view.offerProductStore.getCount();
		
		IOrders.logEvent({
			module:'SaleOrder',
			action: 'ProductNameFilter' ,
			data: 'value:' + options.searchFor + ', count:'+ foundCnt
		});
		
		if ( foundCnt > 200) {
			
			Ext.Msg.alert("Внимание", "Слишком много товаров подходит, введите больше букв в поиске", function() {
				var productSearcher = view.dockedItems.get(0).getComponent('ProductSearcher');
				productSearcher.reset();
				view.offerProductStore.clearFilter(true);
				currentProductFilters
					&& view.offerProductStore.filter(currentProductFilters)
				;
				view.offerProductStore.resumeEvents();		
			});
			
		} else {
			
			view.offerProductStore.resumeEvents();
			
			view.offerProductStore.fireEvent('datachanged', view.offerProductStore);
			
			view.offerProductStore.filtersSnapshot
				|| (view.offerProductStore.filtersSnapshot = currentProductFilters)
			;
			
			Ext.dispatch(Ext.apply(options, {
				action: 'beforeFilterofferProductStore'
			}));
			
			Ext.dispatch(Ext.apply(options, {
				action: 'afterFilterofferProductStore',
				filterSet: true
			}));
			
			var cf = view.dockedItems.get(0).getComponent('ClearFilter');
			
			cf && cf.show('fade');
			
		}
		
		view.setLoading(false);
	},

	toggleProductNameFilterOff: function(options) {
		
		Ext.dispatch(Ext.apply(options, {
			action: 'onClearFilterButtonTap'
		}));
		
	},
	
	toggleShowSaleOrderOn: function(options) {

		Ext.dispatch(Ext.apply(options, {action: 'beforeShowSaleOrder', mode: true}));

		var view = options.view,
			btnClearFilter = view.dockedItems.get(0).getComponent('ClearFilter'),
			productSearcher = view.dockedItems.get(0).getComponent('ProductSearcher'),
			segBtn = view.getDockedComponent('top').getComponent('ModeChanger'),
			activeBtn = segBtn.getComponent('Active'),
			bonusBtn = segBtn.getComponent('Bonus')
		;
		
		activeBtn.disable();
		bonusBtn.disable();
		btnClearFilter.disable();
		productSearcher.disable();
		
		var ops = view.offerProductStore;
		
		ops.saleOrderModeFiltersSnapshot = view.offerProductStore.filters.clone().items;
		ops.clearFilter(true);
		ops.filter(view.offerProductStore.volumeFilter);
		
		if (tableHasColumn ('Offer','SaleOrderPosition_deviceCts')) {
			
			view.productList.unGroup();
			
			ops.sorters && (ops.sortersBeforeShowSaleOrder = ops.sorters.clone());
			ops.sort ({ property: 'SaleOrderPosition_deviceCts', direction: 'desc'});
			
		}
		
		view.productCategoryList.deselect(
			view.productCategoryList.saleOrderModeSelectionSnaphot = view.productCategoryList.getSelectedRecords()
		);

		view.offerCategoryStore.remoteFilter = false;
		view.offerCategoryStore.clearFilter(true);
		view.offerCategoryStore.filter(new Ext.util.Filter({
			filterFn: function(item) {
				return view.offerProductStore.findExact('category', item.get('category')) > -1 ? true : false;
			}
		}));

		Ext.dispatch(Ext.apply(options, {
			action: 'afterFilterofferProductStore',
			filterSet: true
		}));
	},

	toggleShowSaleOrderOff: function(options) {

		Ext.dispatch(Ext.apply(options, {action: 'beforeShowSaleOrder', mode: false}));

		var view = options.view,
			btnClearFilter = view.dockedItems.get(0).getComponent('ClearFilter'),
			productSearcher = view.dockedItems.get(0).getComponent('ProductSearcher'),
			segBtn = view.getDockedComponent('top').getComponent('ModeChanger'),
			activeBtn = segBtn.getComponent('Active'),
			bonusBtn = segBtn.getComponent('Bonus')
		;
		
		activeBtn.enable();
		bonusBtn.enable();
		btnClearFilter.enable();
		productSearcher.enable();
		
		var ops = view.offerProductStore;
		
		ops.clearFilter(true);
		
		if (ops.saleOrderModeFiltersSnapshot && ops.saleOrderModeFiltersSnapshot.length){
			ops.filter(ops.saleOrderModeFiltersSnapshot);
		} else {
			ops.filterBy(function(){return false});
		}
		
		view.offerCategoryStore.clearFilter(true);
		
		if (ops.sortersBeforeShowSaleOrder) {
			ops.sorters = ops.sortersBeforeShowSaleOrder;
			view.productList.reGroup();
			ops.sort();
		}
		
		if (view.productSearchFilter)
			view.offerCategoryStore.filter(new Ext.util.Filter({
				filterFn: function(item) {
				return view.offerProductStore.findExact('category', item.get('category')) > -1 ? true : false;
				}
			}));
		else
			view.offerCategoryStore.fireEvent('datachanged',view.offerCategoryStore)
		;
		
		view.productCategoryList.getSelectionModel().select(
			view.productCategoryList.saleOrderModeSelectionSnaphot
		);

		view.offerProductStore.saleOrderModeFiltersSnapshot = undefined;
		view.productCategoryList.saleOrderModeSelectionSnaphot = undefined;
		
		Ext.dispatch(Ext.apply(options, {
			action: 'afterFilterofferProductStore',
			filterSet: view.productSearchFilter ? true : false
		}));
	},

	beforeShowSaleOrder: function(options) {

		var view = options.view;

		view.setLoading(true);
		view.isShowSaleOrder = options.mode;
	},

	afterFilterofferProductStore: function(options) {

		var view = options.view;

		view.productCategoryList.scroller && view.productCategoryList.scroller.scrollTo({y: 0});
        view.productList.scroller && view.productList.scroller.scrollTo ({y:0});
		
		if (options.filterSet) {
			view.productCategoryList.el.removeCls('expandable');
			view.productList.el.removeCls('expandable');
		}
		else{
			view.productCategoryList.el.addCls('expandable');
			view.productList.el.addCls('expandable');
			Ext.each(view.productCategoryList.el.query('.x-item-selected'), function(el){
				Ext.get(el).parent().addCls('expanded');
			});
		}
		
		view.productListIndexBar.loadIndex();
		
		Ext.dispatch(Ext.apply(options, {action: 'expandFocusedProduct'}));
		
		view.modeActive && Ext.dispatch(Ext.apply(options, {action: 'toggleActiveOn'}));
		
		view.setLoading(false);
	},

	onModeButtonTap: function(options) {
		
		var btn = options.btn,
			pressed = options.pressed
		;
		
		if (pressed) {
			Ext.each (options.segBtn.getPressed(), function (b) {
				if (b.itemId != btn.itemId) {
					options.segBtn.setPressed(b.itemId,false,false);
				}
			});
		}
		
		changeBtnText(btn);
		
		var action = 'toggle' + btn.itemId + (pressed ? 'On' : 'Off');
		
		if (this[action]) {
			
			Ext.dispatch(Ext.apply(options, {
				action: action
			}));
			
		} else if (btn.criteria) {
			
			Ext.dispatch(Ext.apply(options, {
				action: 'toggleActive' + (pressed ? 'On' : 'Off'),
				criteria: btn.criteria
			}));
			
		}
		
	},

	toggleFilterPanelOn: function(options) {

		var view = options.view || options.list.up('saleorderview'),
			filterStore = options.filterStore,
			name = options.filterName,
			panelName = lowercaseFirstLetter(name) + 'Panel',
			listName = panelName + 'List'
		;
		
		var segBtn = view.getDockedComponent('top').getComponent('ModeChanger'),
			modeBtn = segBtn.getComponent(name)
		;
		
		if (modeBtn ) {
			segBtn.setPressed(modeBtn , true, true);
			changeBtnText(modeBtn);
		}
		
		if(!view[panelName]) {
			
			var modelName = filterStore.model.modelName,
				listGroupedConfig = getGroupConfig(modelName),
				sortersConfig = getSortersConfig(modelName, listGroupedConfig),
				listConfig = getItemTplMeta(modelName, {
					groupField: listGroupedConfig.field
				})
			;
			
			view [panelName] = Ext.create({
				id: panelName,
				xtype: 'panel',
				floating: true,
				centered: true,
				layout: 'fit',
				width: view.getWidth() / 2,
				height: view.getHeight() * 2 / 3,
				dockedItems: [],
				items: [Ext.apply(listConfig,{
					xtype: 'list',
					itemId: listName,
					store: filterStore,
					grouped: listGroupedConfig.field ? true : false,
					groupField: listGroupedConfig.field,
					listeners: {
						itemtap: function(list, idx, item, e) {
							Ext.dispatch({
								controller: 'SaleOrder',
								action: 'on'+uppercaseFirstLetter(panelName)+'ListItemSelect',
								view: view,
								panel: list.up(),
								list: list, idx: idx, item: item, event: e
							});
						}
					}
				})],
				listeners: {
					hide: function() {
						if(!view[lowercaseFirstLetter(name)+'Mode'] && modeBtn) {
							segBtn.setPressed(modeBtn, false, true);
							changeBtnText(modeBtn);
						}
					}
				}
			});
			
			view.cmpLinkArray.push(view[panelName]);
		}
		
		var panel = view[panelName],		
			list = panel.getComponent(listName)
		;
		
		list.refresh();
		panel.show();
		
		if(filterStore.getCount() < 1) {
			//view.bonusPanel.hide();
		}

        list.scroller && list.scroller.scrollTo({y: 0});
	},
	
	toggleBonusOn: function(options) {
		Ext.dispatch(Ext.apply(options, {
			action: 'toggleBonusPanelOn'
		}));
	},
	
	toggleBonusOff: function(options) {
		console.log('toggleBonusOff');
	},
	
	toggleBonusPanelOn: function(options) {

		var view = options.view,
			rec = options.rec,
			bonusStore = view.bonusProgramStore,
			bonusProductStore = view.bonusProductStore
		;
		
		bonusProductStore.clearFilter(true);
		bonusStore.clearFilter(true);
		
		if(rec) {
			
			bonusProductStore.filter({
				property: 'product',
				value: rec.get('product')
			});
			
			bonusStore.filter(function(item) {
				return bonusProductStore.findExact('actionVariant', item.getId()) !== -1;
			});
			
			//var bonusList = view.bonusPanel.getComponent('bonusList');
			//bonusList.selectSnapshot && bonusList.selModel.select(bonusList.selectSnapshot);
			
		} else if(options.atStart) {
			
			view.bonusProgramStore.filterBy(function(item) {
				return (item.get('isPopAtStart') || item.get('isWithMsg'))
			});
			
			//var bonusList = view.bonusPanel.getComponent('bonusList');
			//bonusList.selectSnapshot && bonusList.selModel.select(bonusList.selectSnapshot);
			
		}
		
		if (bonusStore.getCount()) 
			Ext.dispatch(Ext.apply(options, {
				action: 'toggleFilterPanelOn',
				filterName: 'Bonus',
				filterStore: bonusStore
			}))
		;
		
	},

	toggleBonusActiveOn: function(options) {
		if(!options.atStart) 
			Ext.dispatch(Ext.apply(options, {
				action: 'toggleActiveOn',
				criteria: '.hasAction'
			}))
		;
	},
	
	toggleBonusActiveOff: function(options) {

//		var view = options.view,
//			segBtn = view.getDockedComponent('top').getComponent('ModeChanger'),
//			bonusBtn = segBtn.getComponent('Bonus')
//		;

//		segBtn.setPressed(bonusBtn, true);
		
		Ext.dispatch(Ext.apply(options, {
			action: 'toggleActiveOff',
			criteria: '.hasActive'
		}));

	},

	onGroupLastnameButtonTap: function(options) {

		var view = options.view;

		view.offerProductStore.groupField = 'lastName';
		view.offerProductStore.sorters.removeAll();
		view.offerProductStore.remoteSort = false;
		view.offerProductStore.sort([{property: 'lastName', direction: 'ASC'}, {property: 'name', direction: 'ASC'}]);

		view.productList.refresh();

		view.productListIndexBar.loadIndex();
	},

	onGroupFirstnameButtonTap: function(options) {

		var view = options.view;

		view.offerProductStore.groupField = 'firstName';
		view.offerProductStore.sorters.removeAll();
		view.offerProductStore.remoteSort = false;
		view.offerProductStore.sort([{property: 'firstName', direction: 'ASC'}, {property: 'name', direction: 'ASC'}]);

		view.productList.refresh();

		view.productListIndexBar.loadIndex();
	},

	onAllBonusButtonTap: function(options) {

		var view = options.view,
			bonusList = view.bonusPanel.getComponent('bonusList')
		;

		bonusList.selModel.select(bonusList.store.getRange());
	},

	onBonusItemSelect: function(options) {
		
		var view = options.view,
			bonusList = view.bonusPanel.getComponent('bonusList'),
			tapedBonus = bonusList.getRecord(options.item),
			selectedBonus = bonusList.selModel.getSelection()[0],
			segBtn = view.getDockedComponent('top').getComponent('ModeChanger'),
			btnShowSaleOrder = segBtn.getComponent('ShowSaleOrder')
		;
		
		btnShowSaleOrder.disable();
		;
		
		if(!selectedBonus || tapedBonus.getId() != selectedBonus.getId()) {
			
			IOrders.logEvent({
				module:'BonusFilter',
				action: 'select' ,
				data: 'BonusProgram:'+tapedBonus.get('id') + ', Customer:'+ view.saleOrder.get('customer')
			});
			
			bonusList.selectSnapshot = tapedBonus;
			
			view.bonusProductStore.filterBy(function(rec, id) {
				return tapedBonus.get('id') == rec.get('bonusProgram');
			});
			
			view.offerProductStore.bonusFilter = view.offerProductStore.bonusFilter || new Ext.util.Filter({
				filterFn: function(item) {
					return view.bonusProductStore.findExact('product', item.get('product')) != -1;
				}
			});
			
			view.bonusMode || (
				view.offerProductStore.filtersSnapshot = view.offerProductStore.filters.clone().items
			);
			view.offerProductStore.clearFilter(true);
			view.offerProductStore.filter(view.offerProductStore.bonusFilter);
			
			view.productSearchFilter = undefined;
			
			view.bonusProductStore.clearFilter(true);
			
			if(view.offerProductStore.getCount() > 0) {
				
				Ext.dispatch(Ext.apply(options, {
					action: 'beforeFilterofferProductStore'
				}));
				
				view.bonusMode || Ext.dispatch(Ext.apply(options, {
					action: 'afterFilterofferProductStore',
					filterSet: true
				}));
				view.bonusMode = true;
				
				var cf = view.dockedItems.get(0).getComponent('ClearFilter');
				
				cf && cf.show('fade');
				
			} else {
				
				Ext.Msg.alert('Нет товаров', 'По выбранной акции нет товаров для заказа');
				view.offerProductStore.clearFilter(true);
				view.offerProductStore.filter(view.offerProductStore.filtersSnapshot);
				
			}
		} else {
			Ext.dispatch(Ext.apply(options, {action: 'onClearFilterButtonTap'}))
		}
		
		view.productListIndexBar.loadIndex();
		view.bonusPanel.hide();
	},
	
	onClearFilterButtonTap: function(options) {
		
		var view=options.view;
		
		var	btn = options.btn || view.dockedItems.get(0).getComponent('ClearFilter'),
			bonusList = view.bonusPanel && view.bonusPanel.getComponent('bonusList'),
			productSearcher = view.dockedItems.get(0).getComponent('ProductSearcher'),
			segBtn = view.getDockedComponent('top').getComponent('ModeChanger'),
			bonusBtn = segBtn.getComponent('Bonus'),
			btnShowSaleOrder = segBtn.getComponent('ShowSaleOrder')
		;
		
		btnShowSaleOrder.enable();
		;
		
		productSearcher
			&& productSearcher.reset()
		;
		
		view.productSearchFilter = undefined;
		
		if (view.offerProductStore.filtersSnapshot && view.offerProductStore.filtersSnapshot.length) {
			view.offerProductStore.clearFilter(true);
			view.offerProductStore.filter(view.offerProductStore.filtersSnapshot);
		}
		
		view.offerProductStore.bonusFilter = false;
		
		view.offerCategoryStore.clearFilter();
		
		view.productCategoryList.selectionSnaphot
			&& view.productCategoryList.getSelectionModel().select(
				view.productCategoryList.selectionSnaphot
			)
		;
		
		view.offerProductStore.filtersSnapshot = undefined;
		view.productCategoryList.selectionSnaphot = undefined;
		
		Ext.dispatch(Ext.apply(options, {
			action: 'afterFilterofferProductStore',
			filterSet: false
		}));
		
		Ext.each (['Bonus','Charge'], function (b) {
			var btn = segBtn.getComponent(b);
			if (btn) {
				segBtn.setPressed(btn, false);
				view [lowercaseFirstLetter(b)+'Mode'] = false;
			}
		});
		
		if (bonusList) {
			bonusList.selectSnapshot = undefined;
			bonusList.selModel.deselect(bonusList.selModel.getSelection());
		};
		
		btn.hide('fade');
	},

	onShowIndexBarButtonTap: function(options) {
		
		var view = options.view,
			btn = options.btn,
			t = btn.text
		;
		
		btn.setText(btn.altText);
		btn.altText = t;
		
		view.indexBarMode = !view.indexBarMode;
		
		view.productListIndexBar[view.indexBarMode ? 'show' : 'hide']();
		view.productPanel.doLayout();
		
		IOrders.setItemPersistant('indexBarMode', view.indexBarMode);
	}
});