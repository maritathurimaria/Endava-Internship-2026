package ui.tests;

import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import framework.config.ConfigManager;
import ui.base.BaseTest;
import ui.pages.HomePage;
import ui.pages.LoginPage;

class HomePageTest extends BaseTest {

    @Test
    void userCanNavigateToMyAccount() {
        LoginPage loginPage = new LoginPage();
        loginPage.init(page);
        loginPage.openLoginPage(ConfigManager.get("base.url"));

        HomePage homePage = loginPage.login(
                ConfigManager.get("login.username"),
                ConfigManager.get("login.password")
        );

        assertTrue(homePage.isHomePageVisible(), "Home page should be visible");

        homePage.navigateToMyAccount();

        assertTrue(homePage.isMyAccountPageVisible(), 
                "My Account page should be visible after clicking the link");
    }


}