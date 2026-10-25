package app.couplemetric.android;

import android.os.Bundle;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(getBridge().getWebView(), false);
    }

    /**
     * Persist cookies as early as the lifecycle allows.
     *
     * The WebView keeps cookies in memory and writes them to disk lazily, so an
     * unflushed session cookie dies with the process. We previously flushed only
     * in onStop(), which Android does not guarantee: under memory pressure, and
     * on OEM builds with aggressive process management, an app can be killed
     * after onPause() without onStop() ever running. That loses the session and
     * the user opens the app logged out -- reported twice by testers.
     *
     * onPause() is guaranteed before the app leaves the foreground, so flushing
     * here is the durable point. onStop() still flushes as a backstop; flush() is
     * cheap and idempotent.
     */
    @Override
    public void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    public void onStop() {
        super.onStop();
        CookieManager.getInstance().flush();
    }
}
