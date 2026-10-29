package ui.tests;

import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import framework.config.ConfigManager;
import ui.base.BaseTest;
import ui.pages.HomePage;
import ui.pages.LoginPage;
import ui.pages.NewTransactionPage;

public class TransactionTest extends BaseTest {

    @Test
    void userCanCreateAndVerifyTransaction() {

       //1
        LoginPage loginPage = new LoginPage();
        loginPage.init(page);

        loginPage.openLoginPage(
            ConfigManager.get("base.url")
        );

        HomePage homePage = loginPage.login(
            ConfigManager.get("login.username"),
            ConfigManager.get("login.password")
        );

        assertTrue(
            homePage.isHomePageVisible(),
            "Home page should be visible after login"
        );

        //2
        homePage.clickNewTransaction();

        NewTransactionPage transactionPage = new NewTransactionPage();
        transactionPage.init(page);

        //3
        String username = "Darrel Ortiz";
        transactionPage.selectUser(username);

        //4
        String amount = "100";
        String note = "Automation test " + System.currentTimeMillis();

        transactionPage.enterAmount(amount);
        transactionPage.enterNote(note);

        //5
        transactionPage.clickPay();

        assertTrue(
            transactionPage.isPaymentSuccessful(),
            "Payment should be successful"
        );

        //6
        transactionPage.returnToTransactions();
        homePage.clickHome();

        //7
        homePage.clickMineTab();

        //8
        assertTrue(
            homePage.isTransactionVisible(note),
            "Created transaction should appear in Mine"
        );

        homePage.openTransaction(note);

        //9
        assertTrue(
            homePage.isTransactionDetailVisible(),
            "Transaction Detail page should be visible"
        );

        assertTrue(
            homePage.isTransactionNoteVisible(note),
            "Transaction note should be correct"
        );

        assertTrue(
            homePage.isTransactionAmountVisible("-$100.00"),
            "Transaction amount should be correct"
        );
    }
}