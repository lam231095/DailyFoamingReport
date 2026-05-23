var ERROR_TYPES = [
  'Bọt khí', 'Loang trắng', 'Loang đen', 'Lõm mặt',
  'Xốp biên', 'Cứng đáy', 'NG màu', 'Sọc dao',
  'mm không đều', 'Mỏng dày', 'Cong, biến dạng', 'Nứt rách', 'Lỗi khác',
  'Lỗi độ cứng TRÊN chuẩn', 'Lỗi độ cứng DƯỚI chuẩn'
];

var error_type = "Lỗi khác (25)";

for (var i = 0; i < ERROR_TYPES.length; i++) {
  var type = ERROR_TYPES[i];
  var escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var regex = new RegExp(escapedType + "\\s*\\((\\d+)\\)", 'i');
  var match = error_type.match(regex);
  var value = match ? parseInt(match[1], 10) : 0;
  WScript.Echo(type + " -> " + value);
}
