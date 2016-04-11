/**
 * Created by John Thompson
 */

// Just example code for now - use prototypes later
DataType = function (classname, displayname, color) {
    this.classname = classname;
    this.displayname = displayname;
    this.color = color;
};

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}
