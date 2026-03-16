shader_type spatial;
render_mode unshaded, cull_disabled;

uniform vec4 color : source_color = vec4(0.3, 0.9, 0.3, 0.4);
uniform float fresnel_power : hint_range(0.5, 5.0) = 2.0;
uniform bool is_valid = true;

void fragment() {
	vec4 final_color = is_valid ? color : vec4(0.9, 0.2, 0.2, 0.4);

	// Fresnel edge glow for ghost preview
	float fresnel = pow(1.0 - abs(dot(NORMAL, VIEW)), fresnel_power);
	final_color.a += fresnel * 0.3;
	final_color.a = clamp(final_color.a, 0.0, 0.8);

	ALBEDO = final_color.rgb;
	ALPHA = final_color.a;
}
