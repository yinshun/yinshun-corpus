const links=require("./link-taisho-yinshun.json");
const meta=links.shift();
const corpus=meta.target;
const {stringifyRange,parseRange}=require("ksana-corpus-lib");
const linked={};
links.forEach(function(link){
	const parts=link.split("\t");
	const r=parseRange(parts[1],corpus);
	if (!r)return;
	for (var i=r.start;i<r.end;i++) {
		if (!linked[i]) linked[i]=0;
		linked[i]++;
	}
})
const out=[];
console.log("sorting");
for (var kpos in linked) {
	out.push([linked[kpos],kpos]);
}
out.sort(function(a,b){
	if (b[0]==a[0]) return a[1]-b[1];//sort by kpos
	else return b[0]-a[0];//sort by hit
});

console.log("reducing");

var out2=[],start;
for (var i=1;i<out.length;i++) {
	if (out[i][0]==out[i-1][0] && out[i][1]-1==out[i-1][1]) {

	} else {
		if (start) out2.push(start);
		start=out[i];
	}
	if (out[i][0]<2) break;
}
out2.push(start);
for (var i=0;i<out2.length;i++) {
	out2[i][1]=stringifyRange(out2[i][1],corpus);
}

require("fs").writeFileSync("linkcluster.json",out2.join("\n"),"utf8");