shader_type spatial;
render_mode cull_disabled;

uniform vec4 panel_color : source_color = vec4(0.55, 0.6, 0.7, 1.0);
uniform float xray_opacity : hint_range(0.0, 1.0) = 0.15;
uniform bool xray_mode = false;

void fragment() {
	ALBEDO = panel_color.rgb;
	METALLIC = 0.2;
	ROUGHNESS = 0.6;

	if (xray_mode) {
		ALPHA = xray_opacity;
	} else {
		ALPHA = panel_color.a;
	}
}
