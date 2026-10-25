package app.still.personal;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
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
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView web;
    private Vibrator vibrator;
    private long lastPulse;
    private boolean immersive;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        web = new WebView(this);
        web.setBackgroundColor(0xff14202a);
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

    private void applyImmersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(!immersive);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                if (immersive) controller.hide(WindowInsets.Type.systemBars());
                else controller.show(WindowInsets.Type.systemBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(immersive
                ? View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                  | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                  | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                : View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
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
        web.evaluateJavascript("window.StillApp && StillApp.setActive(false)", null);
        web.onPause();
        web.pauseTimers();
        if (vibrator != null) vibrator.cancel();
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (web != null) {
            web.onResume();
            web.resumeTimers();
            web.evaluateJavascript("window.StillApp && StillApp.setActive(true)", null);
        }
    }

    @Override protected void onDestroy() {
        web.removeJavascriptInterface("StillNative");
        web.destroy();
        super.onDestroy();
    }
}
