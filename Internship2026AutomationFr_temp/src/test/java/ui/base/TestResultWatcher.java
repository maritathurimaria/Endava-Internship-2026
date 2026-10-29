package ui.base;

import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.TestExecutionExceptionHandler;

public class TestResultWatcher
        implements TestExecutionExceptionHandler {

    @Override
    public void handleTestExecutionException(
            ExtensionContext context,
            Throwable cause) throws Throwable {

        Object testInstance = context.getRequiredTestInstance();

        if (testInstance instanceof BaseTest baseTest) {
            baseTest.saveFailureArtifacts(
                    context.getDisplayName()
            );
        }

        throw cause;
    }
}