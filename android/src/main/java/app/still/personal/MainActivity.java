package app.still.personal;

import android.app.Activity;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import android.widget.Toast;
import android.os.Bundle;
import android.os.Build;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.media.AudioManager;
import org.json.JSONObject;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;

/** An offline shell. Only immutable, bundled assets can access the haptic bridge. */
public final class MainActivity extends Activity implements SensorEventListener {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView web;
    private Vibrator vibrator;
    private long lastPulse;
    private boolean immersive;
    private LocalAudio audio;
    private SensorManager sensors;
    private Sensor tiltSensor;
    private boolean motionEnabled, resumed;
    private long lastTilt;
    private float tiltX, tiltY;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        web = new WebView(this);
        web.setBackgroundColor(0xfff4e9d3);
        audio = new LocalAudio(this, message -> web.post(() -> web.evaluateJavascript(
            "window.StillApp && StillApp.audioError(" + JSONObject.quote(message) + ")", null)));
        sensors = (SensorManager)getSystemService(SENSOR_SERVICE);
        if(sensors != null){tiltSensor=sensors.getDefaultSensor(Sensor.TYPE_GRAVITY);if(tiltSensor == null)tiltSensor=sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);}
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        web.addJavascriptInterface(this, "StillNative");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Page navigation is unnecessary: the collection is a single local document.
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String path = request.getUrl().getPath();
                if (!"https".equals(request.getUrl().getScheme()) || !HOST.equals(request.getUrl().getHost())
                        || request.getUrl().getPort() != -1 || !"GET".equals(request.getMethod())
                        || path == null || path.contains("..") || path.contains("\\") || path.contains("\u0000")) {
                    return errorResponse();
                }
                if (path.equals("/")) path = "/index.html";
                String mime = mimeType(path);
                if (mime == null) return errorResponse();
                try {
                    return new WebResourceResponse(mime, path.endsWith(".mp3") ? null : "UTF-8", 200, "OK",
                            Collections.singletonMap("Cache-Control", "no-store"), getAssets().open(path.substring(1)));
                } catch (IOException error) { return errorResponse(); }
            }
        });
        setContentView(web);
        web.loadUrl("https://" + HOST + "/index.html");
    }

    private static String mimeType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".js")) return "text/javascript";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".mp3")) return "audio/mpeg";
        if (path.endsWith(".ogg")) return "audio/ogg";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".ttf")) return "font/ttf";
        if (path.endsWith(".wav")) return "audio/wav";
        return null;
    }

    private static WebResourceResponse errorResponse() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    @JavascriptInterface public void pulse(int kind, int strength) {
        final int safeStrength = Math.max(1, Math.min(3, strength));
        final int safeKind = Math.max(1, Math.min(2, kind));
        runOnUiThread(() -> {
            long now = SystemClock.elapsedRealtime();
            if (!hasWindowFocus() || isFinishing() || now - lastPulse < 40 || vibrator == null || !vibrator.hasVibrator()) return;
            lastPulse = now;
            int amplitude = safeStrength == 1 ? 65 : safeStrength == 2 ? 125 : 190;
            vibrator.vibrate(VibrationEffect.createOneShot(6 + safeKind * 4, vibrator.hasAmplitudeControl() ? amplitude : VibrationEffect.DEFAULT_AMPLITUDE));
        });
    }

    @JavascriptInterface public void setImmersive(boolean enabled) {
        runOnUiThread(() -> { immersive = enabled; applyImmersive(); });
    }

    @JavascriptInterface public void openGitHub() {
        runOnUiThread(() -> {
            try { startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://github.com/medissl"))); }
            catch(ActivityNotFoundException unavailable) { Toast.makeText(this,"No browser is available.",Toast.LENGTH_SHORT).show(); }
        });
    }

    @JavascriptInterface public void configureAudio(boolean active, boolean effects, boolean music,
            double master, double sfx, double bgm, String track) {
        runOnUiThread(() -> audio.configure(active,effects,music,master,sfx,bgm,track));
    }
    @JavascriptInterface public void playSound(String name,double volume,double rate) {
        runOnUiThread(() -> audio.play(name,volume,rate));
    }
    @JavascriptInterface public void setTexture(String name,double volume,double rate) {
        runOnUiThread(() -> audio.texture(name,volume,rate));
    }
    @JavascriptInterface public void stopTexture() { runOnUiThread(() -> audio.stopTexture()); }
    @JavascriptInterface public void setMotionEnabled(boolean value) {
        runOnUiThread(() -> {motionEnabled=value;updateMotion();});
    }
    private void updateMotion(){if(sensors == null)return;sensors.unregisterListener(this);if(resumed && motionEnabled && tiltSensor != null)sensors.registerListener(this,tiltSensor,SensorManager.SENSOR_DELAY_GAME);}
    @Override public void onSensorChanged(SensorEvent event){
        if(!resumed || !motionEnabled)return;
        float alpha=event.sensor.getType()==Sensor.TYPE_ACCELEROMETER?.15f:1f;
        tiltX+=alpha*(event.values[0]-tiltX);tiltY+=alpha*(event.values[1]-tiltY);
        long now=SystemClock.elapsedRealtime();if(now-lastTilt<50)return;lastTilt=now;
        float x=-tiltX,y=tiltY;int rotation=getWindowManager().getDefaultDisplay().getRotation();
        if(rotation==1){x=tiltY;y=tiltX;}else if(rotation==2){x=tiltX;y=-tiltY;}else if(rotation==3){x=-tiltY;y=-tiltX;}
        if(Float.isNaN(x)||Float.isNaN(y)||Float.isInfinite(x)||Float.isInfinite(y))return;
        web.evaluateJavascript("window.StillApp && StillApp.setTilt("+Math.max(-10,Math.min(10,x))+","+Math.max(-10,Math.min(10,y))+")",null);
    }
    @Override public void onAccuracyChanged(Sensor sensor,int accuracy) {}

    private void applyImmersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(!immersive);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(immersive ? 0 :
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                if (immersive) controller.hide(WindowInsets.Type.systemBars());
                else controller.show(WindowInsets.Type.systemBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(immersive
                ? View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                  | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                  | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                : View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        }
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applyImmersive();
    }

    @Override public void onBackPressed() {
        web.evaluateJavascript("window.StillApp ? StillApp.back() : false", result -> {
            if (!"true".equals(result)) finish();
        });
    }

    @Override protected void onPause() {
        resumed=false;updateMotion();audio.setForeground(false);
        web.evaluateJavascript("window.StillApp && StillApp.setActive(false)", null);
        web.onPause();
        web.pauseTimers();
        if (vibrator != null) vibrator.cancel();
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        resumed=true;updateMotion();if(audio != null)audio.setForeground(true);
        if (web != null) {
            web.onResume();
            web.resumeTimers();
            web.evaluateJavascript("window.StillApp && StillApp.setActive(true)", null);
        }
    }

    @Override protected void onDestroy() {
        if(sensors != null)sensors.unregisterListener(this);
        audio.release();
        web.removeJavascriptInterface("StillNative");
        web.destroy();
        super.onDestroy();
    }
}
