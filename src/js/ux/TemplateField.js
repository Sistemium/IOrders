Ext.form.TemplateField = Ext.extend(Ext.form.Field, {
    
    disable: Ext.emptyFn,
    enable: Ext.emptyFn,
    
    inputCls: 'x-template',

    inputType: 'template',
    
    setValue: function(value) {
        return this;
    },
    
    setData: function(data) {
        
        this.fieldEl.dom.innerHTML = this.template.apply(data);
        
    },
    
    renderTpl: [
        '<tpl if="label">',
            '<div class="x-form-label"><span>{label}</span></div>',
        '</tpl>',
        '<tpl if="fieldEl">',
            '<div class="x-form-field-container">',
                '<div id="{inputId}" name="{name}" class="x-input-el {fieldCls}"',
                    '<tpl if="style">style="{style}" </tpl>',
                '>',
                
                '</div>',
            '</div',
        '</tpl>'
    ]
    
});


Ext.reg('templatefield', Ext.form.TemplateField);