package ui.base;

import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Tracing;
import framework.browser.BrowserManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;

import java.nio.file.Files;
import java.nio.file.Path;

@ExtendWith(TestResultWatcher.class)
public abstract class BaseTest {

    protected BrowserManager browserManager;
    protected BrowserContext context;
    protected Page page;

    private boolean tracingStarted;

    @BeforeEach
    protected void setUp() {
        browserManager = new BrowserManager();
        context = browserManager.createContext();
        page = context.newPage();

        page.setDefaultTimeout(
                framework.config.ConfigManager.getInt(
                        "timeout.default"
                )
        );

        context.tracing().start(
                new Tracing.StartOptions()
                        .setScreenshots(true)
                        .setSnapshots(true)
                        .setSources(true)
        );

        tracingStarted = true;
    }

    void saveFailureArtifacts(String testName) {
        String safeName = testName.replaceAll(
                "[^a-zA-Z0-9-_]",
                "_"
        );

        Path directory = Path.of(
                "target",
                "test-artifacts"
        );

        try {
            Files.createDirectories(directory);
        } catch (Exception e) {
            System.err.println(
                    "Could not create artifact directory: "
                            + e.getMessage()
            );
            return;
        }

        // Capturăm screenshot-ul înainte de închiderea browserului.
        if (page != null) {
            try {
                page.screenshot(
                        new Page.ScreenshotOptions()
                                .setPath(
                                        directory.resolve(
                                                safeName + ".png"
                                        )
                                )
                                .setFullPage(true)
                );

                System.out.println(
                        "Screenshot saved: "
                                + directory.resolve(safeName + ".png")
                                .toAbsolutePath()
                );
            } catch (Exception e) {
                System.err.println(
                        "Could not save screenshot: "
                                + e.getMessage()
                );
            }
        }

        // Oprim trace-ul și îl salvăm într-un fișier ZIP.
        if (context != null && tracingStarted) {
            try {
                context.tracing().stop(
                        new Tracing.StopOptions()
                                .setPath(
                                        directory.resolve(
                                                safeName + "-trace.zip"
                                        )
                                )
                );

                tracingStarted = false;

                System.out.println(
                        "Trace saved: "
                                + directory.resolve(
                                safeName + "-trace.zip"
                        ).toAbsolutePath()
                );
            } catch (Exception e) {
                System.err.println(
                        "Could not save trace: "
                                + e.getMessage()
                );
            }
        }
    }

    @AfterEach
    protected void tearDown() {
        try {
            if (context != null && tracingStarted) {
                context.tracing().stop();
                tracingStarted = false;
            }

            if (context != null) {
                context.close();
            }
        } finally {
            if (browserManager != null) {
                browserManager.close();
            }
        }
    }
}