Ext.override(Ext.plugins.PullRefreshPlugin, {
    
	pullRefreshText: 'Потяни вниз для обновления...',
	releaseRefreshText: 'Отпусти для обновления...',
	loadingText: 'Загрузка...',
	
    onListUpdate: function() {
        
        var list = this.list,
            targetEl = list.getTargetEl(),
            scroller = targetEl.getScrollParent()
        ;
        
        if (!this.rendered) {
            this.render();
        }
        
        scroller.el.insertFirst(this.el);
        
        if (!this.refreshFn) {
            this.onLoadComplete.call(this);
        }
    },
    
    render: function() {
        
        var list = this.list,
            targetEl = list.getTargetEl(),
            scroller = targetEl.getScrollParent()
        ;
        
        if (!this.pullTpl.isTemplate) {
            this.pullTpl = new Ext.XTemplate(this.pullTpl);
        }
        
        this.el = this.pullTpl.insertFirst(scroller.el, {
            message: this.pullRefreshText,
            lastUpdated: this.lastUpdated
        }, true);
        
        this.messageEl = this.el.down('.x-list-pullrefresh-message');
        this.updatedEl = this.el.down('.x-list-pullrefresh-updated > span');
        
        this.pullHeight = this.el.getHeight();
        
        this.scroller = scroller;
        
        scroller.on('bouncestart', this.onBounceStart, this);
        scroller.on('offsetchange', this.onOffsetChange, this);
        scroller.on('bounceend', this.onBounceEnd, this);
        scroller.on('offsetboundaryupdate', this.onOffsetBoundaryUpdate, this);
        
        this.rendered = true;
    },
    
	onBeforeLoad: function() {
        
		if (this.isLoading && this.list.store.getCount() > 0) {
			this.list.setLoading(false)
			return false;
		}
        
		return true;
	}
    
});
