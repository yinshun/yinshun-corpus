//正文內的腳注號<ptr type="note" target="id",
var noteid={};
const CaptureText=true;
const Ref=require("./ref");
var refKPos=-1; //kpos of <ref>
var defKPos=-1; //kpos of <def>

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
			this.putBookField("ptr",defkrange,notekpos);
			this.putBookField("def",notekpos,defKPos);
		} else {
			notekpos.forEach(function(p){
				this.putBookField("ptr",defkrange,p)}.bind(this)
			);
			notekpos.forEach(function(p){
				this.putBookField("def",p,defKPos)}.bind(this)
			);

		}
	}
	//might have negative value
}

var note=function(tag,closing){ //note cannot be nested.
	if (tag.attributes.type=="editorial")return;
	var xmlid=tag.attributes["xml:id"];
	if (xmlid) {
		if (closing) { //closing a note in note group
			var krange=this.makeKRange(defKPos,this.kPos);
			def.call(this,xmlid.substr(4),krange);
		} else {//keep the starting kpos of <note>
			defKPos=this.kPos;
		}
	} else { 
		if (tag.attributes["place"]=="inline2") {
				//inline note (夾注)
		} else {
			if (closing) { //inline note
					this.putBookField("note",this.popText());	
			} else {  //capture the text
				return CaptureText;
			}			
		}
	}
}

var noteReset=function(){
	noteid={};
}


var ref=function(tag,closing){ //link to taisho or taixu
	if (tag.isSelfClosing) {
		if (closing){
			var krange=this.makeKRange(this.kPos,this.kPos);
			Ref.parse.call(this,tag.attributes.type,tag.attributes.target,krange);			
		}
	} else {
		if (closing) {
			var krange=this.makeKRange(refKPos,this.kPos);
			Ref.parse.call(this,tag.attributes.type,tag.attributes.target,krange);
		} else {		
			refKPos=this.kPos;
		}		
	}
}

module.exports={note,ptr,ref,noteReset};