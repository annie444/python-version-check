var s={};let t={pronoun:"it",is:"is",was:"was",this:"this"},a={pronoun:"they",is:"are",was:"were",this:"these"};s=class{constructor(s,t){this.singular=s,this.plural=t}pluralize(s){let r=1===s,i=r?this.singular:this.plural;return{...r?t:a,count:s,noun:i}}};export{s as default};
//# sourceMappingURL=python-version-check.dc34f68e.js.map
