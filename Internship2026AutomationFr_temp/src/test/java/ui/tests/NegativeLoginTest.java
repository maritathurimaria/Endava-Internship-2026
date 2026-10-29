package ui.tests;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import framework.config.ConfigManager;
import ui.base.BaseTest;
import ui.pages.LoginPage;


public class NegativeLoginTest extends BaseTest {

    @Test

    void invalidCredentialsShowErrorAndStayOnLoginPage() {
        LoginPage loginPage = new LoginPage();
        loginPage.init(page);

        loginPage.openLoginPage(
            ConfigManager.get("base.url")
        );
        String loginUrl = page.url();
        String invalidUsername = "invalid-user-" + System.currentTimeMillis();
        String invalidPassword = "WrongPassword123!";

        loginPage.enterUsername(invalidUsername);
        loginPage.enterPassword(invalidPassword);
        loginPage.clickLogin();

        assertTrue(
            loginPage.isLoginErrorVisible(),
            "Error message should be visible for invalid credentials"
        );

        assertTrue(
            loginPage.isLoginFormVisible(),
            "The login form should still be visible after failed login"
        );

           assertEquals(
            loginUrl,
            page.url(),
            "The app should not redirect after an unsuccessful login"
        );

    }
}