//正文內的腳注號<ptr type="note" target="id",
var noteid={};
const CaptureText=true;
const Ref=require("./ref");
var refKPos=0; //kpos of <ref>
var defKPos=0; //kpos of <def>
var ptr_id="";
var ptr=function(tag){ //foot note marker in maintext, point to <note xml:id>
	if (tag.attributes.type==="note"){
		var nid=tag.attributes.target;//注釋號
		if (nid){
			const id=nid.substr(5);
			if (this.inChoice==2) return; //ignore sic and orig

			if (noteid[id]) {
				if (typeof noteid[id]=="object") {
					noteid[id].push(this.kPos);
				} else {
			//701.12 in y36.xml note id126.002
					console.warn("note",nid,"has more than one ptr");
					noteid[id]=[noteid[id],this.kPos];
				}
			} else {
				noteid[id]=this.kPos;				
			}
		}
	}
}

//章或節結束前的注釋群  連到注釋號 <note xml:id="id">
//id 只為了找回 ptr 的 kpos
var def=function(id,defkrange){
	var notekpos=noteid[id];
	if (typeof notekpos==="undefined"){
		console.error("def without ptr, xmlid:",id);
		return;
	} else {
		if (typeof notekpos=="number"){
			this.putArticleField("ptr",defkrange,notekpos);
			this.putArticleField("def",notekpos,defKPos);
			this.putArticleField("noteid",id);
		} else {
			notekpos.forEach(function(p){

				this.putArticleField("ptr",defkrange,p)}.bind(this)
			);
			notekpos.forEach(function(p){
				this.putArticleField("def",p,defKPos)}.bind(this)
			);
			notekpos.forEach(function(){
				this.putArticleField("noteid",id)
			})
		}
	}
	//might have negative value
}

const cbetareg=/CBETA, ?T(\d+), ?no\. ?\d+[A-Za-z]?, ?p\. ?(\d+), ?([abc]\d+)/
var linktotaisho=[];
const addtaisholink=function(taishoaddress,kpos,id){
	if (typeof kpos!=="number") {
		console.error("multi kpos of taishoaddress");
	}
	linktotaisho.push([kpos,taishoaddress]);
}
const parseCBETA=function(str,kpos){
	var m=str.match(cbetareg);
	if (m) {
		var v=m[1];
		if (v.charAt(0)=="0") v=v.substr(1);
		var link=v+"p"+m[2]+m[3];
		addtaisholink(link,kpos);
	}
}
const targetreg=/vol:(\d+);page:(p\d+[abc])/
const targetreg2=/vol:(\d+)/
const processTaishoTarget=function(target,kpos){

	if (defKPos) { 
	//ref inside <note xml:id> </note> , use ptr as kpos
	//for link-taisho-yinshun
		kpos=noteid[ptr_id];
	}

	var m=target.match(targetreg);
	if (m) {
		addtaisholink(m[1]+m[2],kpos);
	} else {
		var m=target.match(targetreg2);
		if (m) {
			addtaisholink(m[1]+'p1a0100',kpos); //for y43.xml
		} else {
			console.error("error taisho target",target);
		}
	}
	return target;
}
const notefinalize=function(){
	linktotaisho.sort((a,b)=>a[0]-b[0]);
	const pos=linktotaisho.map(item=>item[0] );
	const value=linktotaisho.map(item=>item[1] );
	require("fs").writeFileSync("linktotaisho.js",'module.exports={'+
		'pos:'+JSON.stringify(pos)+
		'\n,value:'+JSON.stringify(value)+
		'};',"utf8");
	linktotaisho=[];
}
var note=function(tag,closing,kpos,tpos,start,end){ //note cannot be nested.
	if (tag.attributes.type=="editorial")return;
	var xmlid=tag.attributes["xml:id"];
	if (xmlid) {
		if (closing) { //closing a note in note group
			var krange=this.makeRange(defKPos,this.kPos);
			def.call(this,xmlid.substr(4),krange);
			defKPos=0;
		} else {//keep the starting kpos of <note>
			ptr_id=xmlid.substr(4);
			defKPos=this.kPos;
		}
	} else {
		if (tag.attributes.place=="inline" || tag.attributes.place=="inline2") {
			if (tag.attributes.place=="inline" && closing) {
				var krange=this.makeRange(kpos,this.kPos);
				this.putArticleField("span","inlinenote",krange);
			}
			//leave it
		} else {
			if (closing) {
				const t=this.substring(start,end);
				parseCBETA(t,this.kPos);
				t&&this.putArticleField("yinshunnote",t);
			} else {
				return true;//must capture , because some note are very long
			}
		}
	}
	
} 

var noteReset=function(){
	noteid={};
}

const processTarget=function(corpus,target,kpos){
	if (corpus=="taisho") return processTaishoTarget(target,kpos);
	else return target;
}
var ref=function(tag,closing,kpos){ //link to taisho or taixu
	const corpus=tag.attributes.type;
	var target=tag.attributes.target;
	if (tag.isSelfClosing) {
		const krange=this.makeRange(this.kPos,this.kPos);
		target=processTarget(corpus,target,kpos);
		Ref.parse.call(this,corpus,target,krange);
	} else {
		if (closing) {
			const krange=this.makeRange(kpos,this.kPos);
			target=processTarget(corpus,target,kpos);
			Ref.parse.call(this,tag.attributes.type,target,krange);
		}		
	}
}

module.exports={note,ptr,ref,noteReset,notefinalize};