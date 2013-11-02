Ext.override (Ext.SegmentedButton, {
	
	onTap : function(e, t) {
		if (!this.disabled && (t = e.getTarget('.x-button'))) {
			var b = Ext.getCmp(t.id),
				allowPress = true
			;
			b.wasPressed = b.pressed;

			if(this.allowMultiple) {
				var pressed = this.getPressed();
	
				Ext.each(pressed, function(btn) {
	
					Ext.each(btn.disallowOther, function(dBtn) {
						allowPress = allowPress && dBtn != b.itemId;
					});
				});
			}
			if (!b.disabled && allowPress) this.setPressed(b.itemId || t.id, this.allowDepress ? undefined : true);
		}
	},
	
	afterLayout : function(layout) {
        var me = this;
        
        Ext.SegmentedButton.superclass.afterLayout.call(me, layout);
		
        if (!me.initialized) {
            me.items.each(function(item, index) {
                item.disabled || me.setPressed(item, !!item.pressed, true); 
            });
            if (me.allowMultiple) {
                me.pressedButtons = me.getPressedButtons();
            }
            me.initialized = true;
        }
    }
})