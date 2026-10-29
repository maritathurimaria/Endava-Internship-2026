package framework.browser;

import com.microsoft.playwright.*;
import framework.config.ConfigManager;

public class BrowserManager implements AutoCloseable {

    private final Playwright playwright;
    private final Browser browser;

    public BrowserManager() {
        String browserName = ConfigManager.get("browser");
        boolean headless = ConfigManager.getBoolean("headless");

        playwright = Playwright.create();

        BrowserType.LaunchOptions options =
                new BrowserType.LaunchOptions()
                        .setHeadless(headless);

        switch (browserName.toLowerCase()) {
            case "chromium" ->
                    browser = playwright.chromium().launch(options);
            case "firefox" ->
                    browser = playwright.firefox().launch(options);
            default -> {
                playwright.close();
                throw new IllegalArgumentException(
                        "Unsupported browser: " + browserName
                );
            }
        }
    }

    public BrowserContext createContext() {
        return browser.newContext();
    }

    @Override
    public void close() {
        try {
            browser.close();
        } finally {
            playwright.close();
        }
    }
}