import { APIGatewayProxyResult, SNSEvent } from "aws-lambda";
import { IncomingWebhook } from "node_modules/@slack/webhook/dist/IncomingWebhook";

interface MessageFormat {
  Environment: string;
  Message: string;
}

export const lambdaHandler = async (
  event: SNSEvent
): Promise<APIGatewayProxyResult> => {
  const response: APIGatewayProxyResult = {
    statusCode: 200,
    body: JSON.stringify({
      message: "hello world",
    }),
  };

  const parsedMessage: MessageFormat = parseSnsMessage(
    event.Records[0].Sns.Message
  );

  const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL!);
  await webhook.send({
    username: "AWS Beanstalk Status Alerts",
    attachments: [
      {
        author_name: parsedMessage.Environment,
        color: defineColor(parsedMessage.Message),
        text: highlightFirstSentence(parsedMessage.Message),
      },
    ],
  });

  return response;
};

function parseSnsMessage(message: string): MessageFormat {
  try {
    const parts = message.split("\n");

    const data = {
      Environment: "",
      Message: "",
    };

    parts.forEach((part: string) => {
      part = part.trim();

      if (!part) {
        return data;
      }

      if (!part.includes(":")) {
        return data;
      }

      let [key, value] = part.split(":");
      key = key.trim();
      value = value.trim();

      if (!key || !value) {
        return;
      }

      Object.assign(data, { [key]: value });
    });

    return data;
  } catch (error) {
    console.log("parseSnsMsg error: " + error);
    return {
      Environment: "Error",
      Message: "message parsing error",
    };
  }
}

function defineColor(message: string) {
  const errorKeywords =
    "Unsuccessful command, to Degraded, Failed, Error, to Severe";
  const warningKeywords = "to Warning, to Info";

  const arrErrorKeywords = errorKeywords.split(", ");
  const arrWarningKeywords = warningKeywords.split(", ");

  for (const errorKeyword of arrErrorKeywords) {
    if (message.includes(errorKeyword)) {
      return "danger";
    }
  }

  for (const warningKeyword of arrWarningKeywords) {
    if (message.includes(warningKeyword)) {
      return "warning";
    }
  }

  return "good";
}

function highlightFirstSentence(message: string) {
  const sentences = message.split(".");
  sentences[0] = `*${sentences[0]}*`;
  return sentences.join(".");
}
