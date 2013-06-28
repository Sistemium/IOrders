Ext.regController('SaleOrder', {

	onBackButtonTap: function(options) {
		
		var view = options.view;
		
		view.ownerViewConfig.editing = !(options.closeEditing || false);
		view.ownerViewConfig.isNew = view.isNew;
		view.ownerViewConfig.saleOrderStatus = view.saleOrderStatus;
		view.ownerViewConfig.objectRecord = view.saleOrder;
		
		IOrders.viewport.setActiveItem(
			Ext.create(view.ownerViewConfig)
			, IOrders.viewport.anims.back
		);
		
	},

	onAddButtonTap: function (options) {
		
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
		
		var customer = options.view.customerRecord;
		
		Ext.Msg.alert('', 'Клиент: ' + customer.get('name').replace(/"/g, '')
			+ '<br/>' +'Адрес: ' + customer.get('address')
		);
	},

	onSaveButtonTap: function(options) {

		var saleOrder = options.view.saleOrder;
		options.view.isNew && saleOrder.set('processing', options.view.saleOrderStatus);

		options.view.isNew = false;
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
			
			rec.commit(true);

		});

		var tc = saleOrderPosStore.sum('cost'),
			tsc = 0,
			tc0 = 0,
			tc1 = 0,
			tcB = 0
		;
		
		saleOrderPosStore.each (function (rec) {
			tc0 += rec.get('price0') * rec.get('volume0');
			tc1 += rec.get('price1') * rec.get('volume1');
			tcB += rec.get('priceOrigin') * rec.get('volumeBonus');
			tsc += rec.get('priceAgent') * (rec.get('volume0') + rec.get('volume1'));
		});

		view.saleOrder.set ({
			totalCost: tc.toDecimal(2),
			totalCost1: tc1.toDecimal(2),
			totalCost0: tc0.toDecimal(2),
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
		
	},
	
	onListItemTap: function(options) {
		
		var list = options.list,
			listEl = list.getEl(),
			rec = list.getRecord(options.item),
			tapedEl = Ext.get(options.event.target)
		;
		
		if ( rec && tapedEl && tapedEl.is('.folderUnfolder, .folderUnfolder *') ){
			
			rec.set('unfolded', rec.get('unfolded') ? false : true);
			rec.commit();
			
			options.list && rec.get('lastActive') && (function (el) {
				el.addCls('active');
			}) (Ext.get(options.list.getNode(rec)));
			
			Ext.defer(function() {
				this.updateOffsets();
				this.scroller && this.scroller.updateBoundary();
			}, 50, list);
		}
		
		if ( /taste|needle|quoted/.test(options.event.target.className) ){
			
			var 
				item = options.item,
				view = (options.view = list.up('saleorderview')),
				iel = (options.iel = Ext.get(item))
			;
			
			Ext.defer (function() {
				Ext.dispatch(Ext.apply(options, {
					action: 'toggleParticleFilter'
				}));
			}, 100);
			
			return;
		}
		
		if (listEl.hasCls('x-product-category-list')) {
			
			Ext.dispatch(Ext.apply(options, {action: 'onProductCategoryListItemTap'}));
			
		} else if (listEl.hasCls('x-product-list')) {
			
			var target = Ext.get(options.event.target);
			
			if(target.hasCls('crec')){
				Ext.dispatch({
					controller: 'SaleOrder',
					action: 'toggleBonusOn',
					view: list.up('saleorderview'),
					productRec: rec
				});
			}
			
		} else if(listEl.hasCls('x-deps-list')) {
			
			Ext.dispatch(Ext.apply(options,{
				action: 'launchOfferView'
			}));
			
		};
	},
	
	launchOfferView: function(options) {
		
		var oldCard = IOrders.viewport.getActiveItem();
		
		var newCard = Ext.create({
			
			xtype: 'saleorderview',
			saleOrder: options.saleOrder,
			saleOrderStatus: options.saleOrderStatus,
			isNew: options.isNew,
			
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
		};
		
		newCard.startFilters = function(saleOrder) {
			
			var result = [{
				property: 'customer',
				value: saleOrder.get('customer')
			}];
			
			if (tableHasColumn ('Offer', 'saleOrder')) {
				result.push({
					property: 'saleOrder',
					value: saleOrder.get('id')
				})
			};
			
			return result;
		}
		
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
		
		var defaultSchema = '0';
		
		if (tableHasColumn('SaleOrder','salesSchema')) {
			
			defaultSchema = 2 - view.saleOrder.get('salesSchema');
			defaultSchema == -1 && (defaultSchema = 'Bonus');
			
		} else if (tableHasColumn('SaleOrder','isWhite')) {
			
			view.saleOrder.get('isWhite') == 1 && (
				defaultSchema = '1'
			)
			
		}
		
		view.productList = view.productPanel.add( offerProductListConfig ({
			flex: 3,
			store: view.offerProductStore,
			pinHeaders: false,
			defaultVolume: 'volume' + defaultSchema
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
							
							view.offerProductStore.filter (
								view.offerProductStore.isFocusedFilter
							);
							
							view.productListIndexBar.loadIndex();
							
							IOrders.viewport.getActiveItem().setLoading(false);
							
							IOrders.viewport.setActiveItem (view);
							
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
				return rec.get(this.groupField).replace(/ +|\./g, '_');
			},
			
			listeners: {
				
				load: function (store, records) {
					
					view.offerCategoryStore.initLastActive.apply(view.offerCategoryStore,arguments);
					
					var sname = '',
						needle
					;
					
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
							/(красн\.|красное|кр\.)/i,
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
						
						rec.data['name'] = sname;
						
					});
					
				}
				
			},
			
			filter: function(filters, value) {
				
				var bonusofferProductStore = view.bonusofferProductStore,
					bonusProgramStore = view.bonusProgramStore
				;
				
				if (bonusProgramStore && filters && (
						filters.contains && filters.contains(this.isFocusedFilter)
						|| filters == this.isFocusedFilter
					)
				) {
					
					bonusProgramStore.filter({property: 'isFirstScreen', value: true});
					
					bonusofferProductStore.filterBy(function(it) {
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
					bonusofferProductStore.clearFilter(true);
					bonusProgramStore.clearFilter(true);
				}
				
			},
			
			volumeFilter: new Ext.util.Filter({
				filterFn: function(item) {
					return item.get('volume') > 0;
				}
			}),
			
			isFocusedFilter: new Ext.util.Filter({
				filterFn: function(item) {
					if (!view.bonusofferProductStore) return false;
					return (view.bonusofferProductStore.findExact('product'
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
					}))
					
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
			callback = options.callback
		;
		
		var bonusModelName = 'BonusProgramByCustomer';
		
		if (!Ext.ModelMgr.getModel(bonusModelName))
			bonusModelName = 'BonusProgram'
		;
		
		if (!Ext.ModelMgr.getModel(bonusModelName)){
			
			view.bonusProgramStore = undefined;
			console.log ('SaleOrder.launchOfferView bonusProgramStore = undefined');
			
		} else {
			
			view.bonusProgramStore = createStore(
				bonusModelName,
				getGroupConfig(bonusModelName)
			);
			
			view.bonusofferProductStore = createStore(
				'BonusProgramProduct',
				Ext.apply(getSortersConfig('BonusProgramProduct', {}))
			);
			
		}
		
		if (bonusModelName == 'BonusProgramByCustomer')
			view.bonusProgramStore.filters.add({
				property: 'customer',
				value: options.saleOrder.get('customer')
			})
		;
		
		if (view.bonusProgramStore)
			
			Ext.dispatch ( Ext.apply ( options , {
				action: 'toggleBonusStartUp',
				callback: callback
			}));
			
		else
			callback.call()
		;
		
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
				
				view.bonusofferProductStore.load({
					limit: 0,
					callback: function(records) {
						
						view.bonusofferProductStore.remoteFilter = false;
						
						if(records.length) {
							
							view.offerProductStore.filter (view.offerProductStore.volumeFilter);
							
						} else {
							
							var bonusofferProductStore = view.bonusofferProductStore,
								bonusProgramStore = view.bonusProgramStore
							;
							
							bonusProgramStore.filter({
								property: 'isFirstScreen'
								, value: true
							});
							
							bonusofferProductStore.filterBy(function(it) {
								return bonusProgramStore.findExact ( 'id'
									, it.get('bonusProgram')) !== -1 ? true : false
								;
							});
							
							bonusofferProductStore.clearFilter(true);
							bonusProgramStore.clearFilter(true);
							
							view.on('activate', function() {
								view.customerRecord.getCustomerBonusProgram(function(bonusStore) {
									view.customerRecord.bonusProgramStore = bonusStore;
									Ext.dispatch(Ext.apply(options, {
										action: 'toggleBonusOn',
										view: view,
										atStart: true,
										bonusStore: bonusStore
									}));
								});
							});
							
						}
						
						callback.call(this);
						
						Ext.dispatch (Ext.apply (options, {
							action: 'expandFocusedProduct'
							, view: view
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
			factor = 1,
			defaultVolume = options.list.defaultVolume
		;
		
		var data = {
				action: 'setVolume',
				rec: rec
			},
			fname,
			fnames = [
				'volume1', 'volume0','volumeBonus', 'packageRel', 'volume',
				'discount0', 'discount1','discount10','discount11'
			]
		;
		
		Ext.each (fnames, function (f) {
			
			if (listEl.hasCls(f) || listEl.is('.'+f+' *'))
				fname = f;
			
		});
		
		fname == 'volume' && (fname = defaultVolume);
		
		//Ext.each(fname)
		if (fname) {
			
			if (fname == 'packageRel') {
				factor = rec.get(fname);
				fname = defaultVolume;
			}
			
			var v = parseInt (rec.get(fname) || '0');
			
			data[fname] = v + sign * factor;
			
			Ext.dispatch( Ext.apply( options, data ));
			
		}
		
	},
	
	setVolume: function (options) {
		
		var rec = options.rec,
		    view = options.view || options.list.up('saleorderview'),
			rel = parseInt(rec.get('rel')),
			priceAgent = rec.get('priceAgent')
		;
		
		var data = {
			volume: options.volume,
			discount: options.discount,
			cost0: 0,
			cost1: 0
		}, volume = 0;
		
		var setVolumeLogic = function(fname, vMin, vMax) {
			
			var v = options[fname];
			
			v == undefined && (v = data[fname]);
			v == undefined && (v = parseFloat (rec.get(fname) || '0'));
			
			v = parseFloat(v);
			
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
			dMin = -25,
			dMax = 25
		;
		
		Ext.each (['price0', 'price1', 'price10', 'price11'], function (fname) {
			options[fname] && (
				data[fname.replace(/[a-z]*(.*)/,'discount$1')] = (
					(options[fname] - price) / price * 100.0
				).toDecimal(5)
			)
		});
		
		Ext.each (['0', '1'], function (fname) {
			
			data['volume'+fname] = Math.round(data['volume'+fname]);
			
			data['price'+fname] = (
				price * (1.0 + setVolumeLogic ('discount'+fname, dMin, dMax) / 100.0)
			) .toDecimal(2);
			
			data['price1'+fname] = (
				price * (1.0 + setVolumeLogic ('discount1'+fname, dMin, dMax) / 100.0)
			) .toDecimal(2);
			
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
		
		options.list && rec.get('lastActive') && (function (el) {
			el.addCls('active');
		}) (Ext.get(options.list.getNode(rec)));
		
	},
	

	onProductCategoryListItemTap: function(options) {
		
		var list = options.list,
			rec = list.getRecord(options.item),
			view = list.up('saleorderview')
		;
		
		view.setLoading(true);
		
		Ext.apply(options, {action: 'addOfferProductList', view: view, categoryRec: rec});
		
		Ext.defer(Ext.dispatch, 100, this, [options]);
	},

	
	onProductListItemLongTap: function(options) {
		
		var list = options.list,
			item = options.item,
			view = (options.view = list.up('saleorderview')),
			iel = (options.iel = Ext.get(item))
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
			iel = options.iel
		;
		
		var
			value = options.event.target.innerText,
			store = view.offerProductStore,
			groupEl = iel.up ('.x-list-group'),
			groupClass = groupEl && groupEl.dom.className
		;
		
		list.suspendEvents (false);
		
		if (!store.filters.containsKey(value))
			
			store.filter ( {
				id: value,
				property: 'name',
				value: '>'+value+'<',
				anyMatch: true,
				caseSensitive: false
			});
			
		else{
			
			store.filters.removeByKey (value);
			var f = store.filters.clone();
			store.clearFilter(true);
			store.filters = f;
			store.filter();
			
		}
		
		if (groupClass) {
			
			var groupsToExpand = list.getEl().query('.'+groupClass.replace(/ +/g,'.'));
			
			if (groupsToExpand) {
				
				var el = Ext.get(groupsToExpand[0]);
				
				el && Ext.defer(function() {
					
					list.onListHeaderTap(
						false, el.down('.x-list-header')
					);
					
					list.resumeEvents();
					
				}, 50, list);
				
			}
			//Ext.dispatch(Ext.apply(options, {
			//	action: 'expandFocusedProduct'
			//}));
		}
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
					localStorage.setItem('productInfoTab', newC.itemId);
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
									this.pricePanel.setActiveItem(localStorage.getItem('productInfoTab'));
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
			value: rec.get('category')
		});
		
		view.isShowSaleOrder && filters.push(offerProductStore.volumeFilter);
		view.bonusMode && filters.push(offerProductStore.bonusFilter);
		view.productSearchFilter && filters.push(view.productSearchFilter);

		offerProductStore.filter(filters);

		view.productListIndexBar.loadIndex();
		view.productList.scroller.scrollTo ({y:0});
		
		if (view.modeActive)
			Ext.dispatch (Ext.apply (options, {action: 'toggleActiveOn'}));

		Ext.dispatch(Ext.apply(options, {action: 'expandFocusedProduct'}));

		view.setLoading(false);
	},

	expandFocusedProduct: function(options) {
		
		var view = options.view,
			doms = view.productList.getEl().query('.x-list-item .isNonHidable')
		;
		
		Ext.each(doms, function(dom) {
			var el = Ext.get(dom);
			el.up('.x-list-item').addCls('active').up('.x-list-group-items').addCls('hasActive');
		});
		
		doms = view.productList.getEl().query('.x-list-group');
		
		if (doms.length ==1) {
			Ext.get(doms[0]).down('.x-list-group-items').addCls('expanded');
		}
	},

	toggleActiveOn: function( options ) {
		var view = options.view;

		view.modeActive = true;

		var addActiveCls = function(dom) {
			var el = Ext.get(dom);

			el.up('.x-list-item').addCls('active').up('.x-list-group-items').addCls('hasActive');
		}; 

		//productList
		Ext.each (view.productList.getEl().query('.x-list-item .active'), addActiveCls);

		//categoryList
		view.productCategoryList.lockScrollOnExpand
			&& view.productCategoryList.scroller.enable();
		Ext.each(view.productCategoryList.getEl().query('.x-list-item .active'), addActiveCls);
	},
	
	toggleActiveOff: function( options ) {
		var view = options.view;

		view.modeActive = false;

		var removeActiveCls = function(dom) {
			var el = Ext.get(dom);

			el.removeCls('hasActive');
		};

		Ext.each(view.productList.getEl().query('.x-list-group-items'), removeActiveCls);

		view.productCategoryList.scroller.scrollTo({y:0});
		view.productCategoryList.lockScrollOnExpand
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
			currentProductFilters = view.offerProductStore.filters.items
		;
		
		view.setLoading(true);
		
		view.offerProductStore.clearFilter(true);
		view.offerProductStore.suspendEvents();
		view.offerProductStore.filter( view.productSearchFilter = {
			property: 'name',
			value: options.searchFor,
			anyMatch: true,
			caseSensitive: false
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
		
		view.offerProductStore.saleOrderModeFiltersSnapshot = view.offerProductStore.filters.items;
		view.offerProductStore.clearFilter(true);
		view.offerProductStore.filter(view.offerProductStore.volumeFilter);

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
		
		view.offerProductStore.clearFilter(true);
		view.offerProductStore.saleOrderModeFiltersSnapshot
			&& view.offerProductStore.filter(view.offerProductStore.saleOrderModeFiltersSnapshot)
		;
		
		view.offerCategoryStore.clearFilter(true);
		
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
		view.productList.scroller.scrollTo ({y:0});
		
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

		changeBtnText(btn);

		Ext.dispatch(Ext.apply(options, {
			action: 'toggle' + btn.itemId + (pressed ? 'On' : 'Off')
		}));
	},

	toggleBonusOn: function(options) {

		var view = options.view,
			productRec = options.productRec,
			customerBonusProgramStore = options.bonusStore || view.customerRecord.bonusProgramStore
		;
		
		if(!view.bonusPanel) { 
			view.bonusPanel = Ext.create({
				xtype: 'panel',
				floating: true,
				centered: true,
				layout: 'fit',
				width: view.getWidth() / 2,
				height: view.getHeight() * 2 / 3,
				dockedItems: [],
				items: [{
					xtype: 'list',
					itemId: 'bonusList',
					itemTpl: getItemTpl(view.bonusProgramStore.model.modelName),
					store: view.bonusProgramStore,
					listeners: {
						itemtap: function(list, idx, item, e) {
							Ext.dispatch({controller: 'SaleOrder',action: 'onBonusItemSelect', view: view, list: list, idx: idx, item: item, event: e});
						}
					}
				}],
				listeners: {
					hide: function() {
						if(!view.bonusMode) {
							var segBtn = view.getDockedComponent('top').getComponent('ModeChanger'),
								btn = segBtn.getComponent('Bonus')
							;
							segBtn.setPressed(btn, false, true);
							changeBtnText(btn);
						}
						view.bonusofferProductStore.clearFilter(true);
						view.bonusProgramStore.clearFilter(true);
					}
				}
			});
			
			view.cmpLinkArray.push(view.bonusPanel);
		}
		
		var list = view.bonusPanel.getComponent('bonusList'),
			allowedCheck = function(item) {
				return customerBonusProgramStore.findExact('bonusProgram', item.getId()) !== -1 || !item.get('isCustomerTargeted');
			};
		
		list.refresh();
		view.bonusPanel.show();
		
		view.bonusProgramStore.filterBy(allowedCheck);
		
		if(productRec) {
			
			view.bonusofferProductStore.filter({property: 'product', value: productRec.get('product')});
			
			view.bonusProgramStore.filterBy(function(item) {
				return view.bonusofferProductStore.findExact('bonusProgram', item.getId()) !== -1;
			});
			
			var bonusList = view.bonusPanel.getComponent('bonusList');
			bonusList.selectSnapshot && bonusList.selModel.select(bonusList.selectSnapshot);
		}
		
		if(options.atStart) {
			
			view.bonusProgramStore.filterBy(function(item) {
				return (item.get('isPopAtStart') || item.get('isWithMsg')) && allowedCheck (item);
			});
			
			var bonusList = view.bonusPanel.getComponent('bonusList');
			bonusList.selectSnapshot && bonusList.selModel.select(bonusList.selectSnapshot);
		}
		
		if(view.bonusProgramStore.getCount() < 1) {
			view.bonusPanel.hide();
		}
		
		list.scroller.scrollTo({y: 0});
	},

	toggleBonusOff: function(options) {

		var view = options.view,
			segBtn = view.getDockedComponent('top').getComponent('ModeChanger'),
			bonusBtn = segBtn.getComponent('Bonus')
		;

		segBtn.setPressed(bonusBtn, true);
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
			
			view.bonusofferProductStore.filterBy(function(rec, id) {
				return tapedBonus.get('id') == rec.get('bonusProgram');
			});
			
			view.offerProductStore.bonusFilter = view.offerProductStore.bonusFilter || new Ext.util.Filter({
				filterFn: function(item) {
					return view.bonusofferProductStore.findExact('product', item.get('product')) != -1;
				}
			});
			
			view.bonusMode || (view.offerProductStore.filtersSnapshot = view.offerProductStore.filters.items);
			view.offerProductStore.clearFilter(true);
			view.offerProductStore.filter(view.offerProductStore.bonusFilter);
			
			view.productSearchFilter = undefined;
			
			view.bonusofferProductStore.clearFilter(true);
			
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
		var view=options.view,
			btn = options.btn || view.dockedItems.get(0).getComponent('ClearFilter'),
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
		
		view.offerProductStore.clearFilter(true);
		view.offerProductStore.filter(view.offerProductStore.filtersSnapshot);
		
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
		
		segBtn.setPressed(bonusBtn, false);
		
		view.bonusMode = false;
		
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
		
		localStorage.setItem('indexBarMode', view.indexBarMode);
	}
});